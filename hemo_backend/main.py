import os
import io
import json
import base64
import asyncio
import logging

from dotenv import load_dotenv  # type: ignore
import httpx  # type: ignore
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Depends  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel, EmailStr  # type: ignore
from PIL import Image  # type: ignore
from sqlalchemy.orm import Session
from database import init_db, get_db, User, hash_password, verify_password
from earcp_orchestrator import get_ensemble


load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("hemo")

# ── Config ───────────────────────────────────────────────────────────────────
HF_TOKEN       = os.getenv("HF_TOKEN", "")
# Chat/LLM model — served via SambaNova inference provider (supports open LLMs)
MEDGEMMA_MODEL = os.getenv("HF_MEDGEMMA_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
WHISPER_MODEL  = os.getenv("HF_WHISPER_MODEL",  "openai/whisper-large-v3")
LLAVA_MODEL    = os.getenv("HF_LLAVA_MODEL",     "llava-hf/llava-1.5-7b-hf")

# V1 Router: Supports main HF conversational API
HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"
# hf-inference: used for ASR (Whisper) — CPU-capable tasks
HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference/models"
# Direct inference API (for fallback / vision)
HF_INFER_BASE  = "https://api-inference.huggingface.co"
HEADERS        = {"Authorization": f"Bearer {HF_TOKEN}"}

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Hemo AI Backend", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB
init_db()

# Lightweight Ensemble Orchestrator
ensemble = get_ensemble()
logger.info("Ensemble orchestrator initialized.")


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    message: str
    username: str
    token: str = "demo-token" # Placeholder until JWT is fully setup

class ChatResponse(BaseModel):
    response: str

class AudioResponse(BaseModel):
    transcription: str
    ai_response: str
    history: list[dict] = []

class VisionResponse(BaseModel):
    visual_description: str
    medical_analysis: str
    analysis: str

class MultimodalResponse(BaseModel):
    response: str
    transcription: str | None = None
    visual_description: str | None = None
    earcp_weights: dict = {}
    history: list[dict] = []

# ── System prompt ──────────────────────────────────────────────────────────────
def make_system_prompt() -> str:
    return (
        "Tu es Dr. Hemo, un assistant médical bienveillant et expert en drépanocytose (anémie falciforme) "
        "et en santé générale. "
        "Réponds TOUJOURS dans la même langue que l'utilisateur (français, anglais, éwé, etc.). "
        "Sois clair, empathique et précis. Structure tes réponses si nécessaire (listes, étapes). "
        "Rappelle toujours à l'utilisateur de consulter un professionnel de santé pour tout diagnostic."
    )

# ── Core AI helpers ───────────────────────────────────────────────────────────

async def call_medgemma(prompt: str, history: list[dict] | None = None) -> str:
    if history is None:
        history = []

    system = make_system_prompt()
    messages = [{"role": "system", "content": system}]
    for turn in history[-10:]:
        messages.append(turn)
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": MEDGEMMA_MODEL,
        "messages": messages,
        "max_new_tokens": 700,
        "temperature": 0.65,
    }

    url = HF_CHAT_URL
    logger.info(f"→ MedGemma/Gemma-3: {prompt[:80]!r}")
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(url, json=payload, headers=HEADERS)

    if resp.status_code != 200:
        logger.error(f"MedGemma/Gemma-3 {resp.status_code}: {resp.text[:200]}")
        return "Je suis désolé, le service IA est temporairement indisponible. Veuillez réessayer."

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


async def call_medgemma_stream(prompt: str, history: list[dict] | None = None):
    if history is None:
        history = []

    system = make_system_prompt()
    messages = [{"role": "system", "content": system}]
    for turn in history[-10:]:
        messages.append(turn)
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": MEDGEMMA_MODEL,
        "messages": messages,
        "max_tokens": 700,
        "temperature": 0.65,
        "stream": True,
    }

    url = HF_CHAT_URL
    full_text = ""

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=HEADERS) as resp:
            if resp.status_code != 200:
                error_body = await resp.aread()
                logger.error(f"MedGemma stream {resp.status_code}: {error_body[:200]}")
                yield f"data: {json.dumps({'error': 'Service IA indisponible'})}\n\n"
                return

            async for line in resp.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                chunk = line[6:]
                if chunk.strip() == "[DONE]":
                    break
                try:
                    obj = json.loads(chunk)
                    delta = obj["choices"][0]["delta"].get("content", "")
                    if delta:
                        full_text += delta
                        yield f"data: {json.dumps({'delta': delta, 'done': False})}\n\n"
                except Exception:
                    pass

    yield f"data: {json.dumps({'delta': '', 'done': True, 'full': full_text})}\n\n"


async def call_llava_description(image_bytes: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        max_side = 768
        w, h = img.size
        if max(w, h) > max_side:
            scale = max_side / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        img_b64 = base64.b64encode(buf.getvalue()).decode()
        img_url = f"data:image/jpeg;base64,{img_b64}"

        description_prompt = (
            "Describe this medical image in detail. Include: "
            "what type of image it is (X-ray, photo, lab result, skin lesion, etc.), "
            "visible structures, any abnormalities, colors, patterns, and any text visible. "
            "Be factual and exhaustive. Do NOT give a diagnosis — only describe what you see."
        )

        payload = {
            "model": LLAVA_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": img_url}},
                        {"type": "text", "text": description_prompt},
                    ],
                }
            ],
            "max_new_tokens": 400,
            "temperature": 0.2,
        }

        url = f"{HF_INFER_BASE}/v1/chat/completions"
        logger.info("→ LLaVA: requesting visual description")
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=payload, headers=HEADERS)

        if resp.status_code != 200:
            logger.warning(f"LLaVA failed {resp.status_code}: {resp.text[:200]}. Falling back.")
            return ""

        data = resp.json()
        description = data["choices"][0]["message"]["content"].strip()
        logger.info(f"LLaVA description ({len(description)} chars)")
        return description

    except Exception as e:
        logger.warning(f"LLaVA exception: {e}. Falling back to text-only.")
        return ""


async def call_multimodal_analysis(
    image_bytes: bytes,
    user_question: str,
    history: list[dict] | None = None,
) -> tuple[str, str]:
    if history is None:
        history = []

    visual_description = await call_llava_description(image_bytes)

    if visual_description:
        medgemma_prompt = (
            f"[DESCRIPTION VISUELLE DE L'IMAGE]\n{visual_description}\n\n"
            f"[QUESTION DE L'UTILISATEUR]\n{user_question}\n\n"
            "En tant que Dr. Hemo, donne une analyse médicale approfondie de cette image "
            "en te basant sur la description visuelle ci-dessus. "
            "Identifie les éléments médicaux pertinents, explique ce qu'ils signifient "
            "dans le contexte de la drépanocytose ou de la santé générale, et donne des conseils pratiques. "
            "Structure ta réponse clairement."
        )
    else:
        medgemma_prompt = (
            f"[Image médicale soumise — analyse visuelle indisponible]\n"
            f"[QUESTION DE L'UTILISATEUR]\n{user_question}\n\n"
            "Réponds à la question médicale de l'utilisateur même sans accès à l'image. "
            "Demande-lui de décrire ce qu'il voit si possible."
        )

    medical_analysis = await call_medgemma(medgemma_prompt, history)
    return visual_description, medical_analysis


async def call_whisper(audio_bytes: bytes) -> str:
    url = f"{HF_ROUTER_BASE}/{WHISPER_MODEL}"
    logger.info(f"→ Whisper: {len(audio_bytes)} bytes")
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            url,
            content=audio_bytes,
            headers={**HEADERS, "Content-Type": "audio/webm"},
        )

    if resp.status_code != 200:
        logger.error(f"Whisper {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(status_code=502, detail=f"Whisper transcription failed: {resp.status_code}")

    data = resp.json()
    text = data.get("text", "").strip()
    logger.info(f"Whisper result: {text!r}")
    return text


async def synthesize_tts(text: str, lang: str = "fr") -> bytes:
    """
    Generate TTS audio using gTTS and return MP3 bytes.
    Falls back to empty bytes on error.
    """
    try:
        from gtts import gTTS  # type: ignore
        tts = gTTS(text=text[:500], lang=lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        logger.info(f"TTS synthesized ({len(text)} chars)")
        return buf.read()
    except Exception as e:
        logger.warning(f"TTS failed: {e}")
        return b""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Success", "username": new_user.username, "token": "signup-token"}

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Logged in", "username": user.username, "token": "login-token"}

@app.get("/api/health")
async def health():
    ensemble = get_ensemble()
    return {
        "status": "ok",
        "service": "Hemo AI Backend",
        "version": "3.0.0",
        "models": {
            "chat": MEDGEMMA_MODEL,
            "vision": LLAVA_MODEL,
            "whisper": WHISPER_MODEL,
        },
        "earcp": ensemble.get_diagnostics(),
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Standard text chat with conversation history."""
    logger.info(f"Chat: {req.message[:80]!r}")
    response = await call_medgemma(req.message, req.history)
    return {"response": response}


@app.get("/api/chat/stream")
async def chat_stream(message: str, history_json: str = "[]"):
    """SSE streaming endpoint."""
    try:
        history = json.loads(history_json)
    except Exception:
        history = []

    logger.info(f"Chat stream: {message[:80]!r}")

    return StreamingResponse(
        call_medgemma_stream(message, history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/audio", response_model=AudioResponse)
async def audio_query(
    file: UploadFile = File(...),
    history_json: str = Form(default="[]"),
):
    """Voice input: audio → Whisper → MedGemma → response."""
    logger.info(f"Audio: {file.filename}")
    audio_bytes = await file.read()

    try:
        history: list[dict] = json.loads(history_json)
    except Exception:
        history = []

    transcription = await call_whisper(audio_bytes)
    if not transcription:
        raise HTTPException(status_code=422, detail="Empty transcription — please speak clearly.")

    ai_response = await call_medgemma(transcription, history)

    updated_history = history + [
        {"role": "user", "content": transcription},
        {"role": "assistant", "content": ai_response},
    ]

    return {
        "transcription": transcription,
        "ai_response": ai_response,
        "history": updated_history,
    }


@app.post("/api/vision", response_model=VisionResponse)
async def vision_query(
    file: UploadFile = File(...),
    prompt: str = Form(default="Analyse cette image médicale."),
    history_json: str = Form(default="[]"),
):
    """Multimodal image analysis: LLaVA + MedGemma."""
    logger.info(f"Vision: {file.filename}, prompt={prompt[:60]!r}")
    image_bytes = await file.read()

    try:
        history: list[dict] = json.loads(history_json)
    except Exception:
        history = []

    visual_description, medical_analysis = await call_multimodal_analysis(
        image_bytes, prompt, history
    )

    combined = (
        f"**Analyse visuelle :**\n{visual_description}\n\n**Analyse médicale :**\n{medical_analysis}"
        if visual_description
        else medical_analysis
    )

    return {
        "visual_description": visual_description,
        "medical_analysis": medical_analysis,
        "analysis": combined,
    }


@app.post("/api/tts")
async def text_to_speech(req: ChatRequest):
    """
    Convert text to speech using gTTS.
    Returns MP3 audio bytes as base64 in JSON for easy frontend use.
    """
    text = req.message
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # Detect language (basic heuristic)
    lang = "fr"
    english_words = {"the", "is", "are", "this", "that", "what", "how", "when", "where"}
    words = set(text.lower().split()[:10])
    if words & english_words:
        lang = "en"

    audio_bytes = await synthesize_tts(text, lang=lang)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="TTS synthesis failed.")

    audio_b64 = base64.b64encode(audio_bytes).decode()
    return {"audio_b64": audio_b64, "format": "mp3", "lang": lang}


@app.post("/api/multimodal", response_model=MultimodalResponse)
async def multimodal_unified(
    text: str = Form(default=""),
    history_json: str = Form(default="[]"),
    tts: str = Form(default="false"),
    image: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
):
    """
    ★ Unified multimodal endpoint orchestrated by EARCP ★

    Accepts any combination of:
      - text: a typed message
      - image: an uploaded image file (triggers LLaVA + MedGemma)
      - audio: a recorded audio file (triggers Whisper → MedGemma)
      - tts: "true" → return audio of the response as base64 MP3

    EARCP dynamically weights the three expert models based on which
    modalities are present and how well each performed in previous turns.

    Returns:
      - response: the final text response from Dr. Hemo
      - transcription: if audio was provided
      - visual_description: if image was provided
      - earcp_weights: live model weights from the ensemble
      - history: updated conversation history
      - audio_b64: (optional) TTS audio if tts=true
    """
    try:
        history: list[dict] = json.loads(history_json)
    except Exception:
        history = []

    transcription: str | None = None
    visual_description: str | None = None

    if audio is not None:
        logger.info("Multimodal: Audio input detected")
        audio_bytes = await audio.read()

    image_b64: str | None = None
    if image is not None:
        logger.info("Multimodal: Image input detected")
        image_bytes = await image.read()
        image_b64 = base64.b64encode(image_bytes).decode()

    # ── Execute the Unified Hemo Orchestration ──────────────────────────────
    logger.info("Executing Hemo multimodal orchestration...")
    
    transcription = None
    if audio is not None:
        audio_bytes = await audio.read()
        # In a real scenario, we save to temp or pass bytes. 
        # For simplicity, we use the ensemble's router logic.
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False, mode='wb') as f:
            f.write(audio_bytes)
            f.flush()
            audio_out = ensemble.process_audio(f.name)
            transcription = audio_out.get("transcription")
        os.unlink(f.name)

    visual_description = None
    if image is not None:
        image_bytes = await image.read()
        image_b64 = base64.b64encode(image_bytes).decode()
        vision_out = ensemble.process_vision(image_b64, text)
        visual_description = vision_out.get("visual_description")

    # Generate final response
    prompt = text or (transcription if transcription else "Analyse cette image.")
    if visual_description:
        prompt = f"Description visuelle: {visual_description}\nUtilisateur: {prompt}"

    ai_response = await call_medgemma(prompt, history)
    earcp_weights = ensemble.get_weights()
    
    logger.info(f"Unified model responded. EARCP weights: {earcp_weights}")

    # ── Step 5: Update conversation history ───────────────────────────────────
    user_content = text.strip()
    if transcription:
        user_content = transcription if not user_content else f"{user_content}\n{transcription}"
    if visual_description:
        user_content += f"\n[Image analysée — {len(visual_description)} chars de description visuelle]"

    updated_history = history + [
        {"role": "user", "content": user_content or "Analyse cette image médicale."},
        {"role": "assistant", "content": ai_response},
    ]

    # ── Step 6: Optional TTS ──────────────────────────────────────────────────
    audio_b64_res = None
    if tts.lower() == "true":
        tts_bytes = await synthesize_tts(ai_response)
        if tts_bytes:
            audio_b64_res = base64.b64encode(tts_bytes).decode()

    result = {
        "response": ai_response,
        "transcription": transcription,
        "visual_description": visual_description,
        "earcp_weights": earcp_weights,
        "history": updated_history,
    }
    if audio_b64_res:
        result["audio_b64"] = audio_b64_res

    return result


@app.post("/api/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    prompt: str = Form(default=""),
):
    """Analyse a medical document (PDF/image)."""
    content_type = file.content_type or ""
    file_bytes = await file.read()

    if "image" in content_type:
        q = prompt or "Analysez ce document médical et fournissez un résumé clair avec les points clés."
        visual_desc, medical = await call_multimodal_analysis(file_bytes, q)
        summary = (
            f"**Description :** {visual_desc}\n\n**Analyse :** {medical}"
            if visual_desc
            else medical
        )
        return {"summary": summary, "visual_description": visual_desc, "filename": file.filename}
    else:
        q = (
            prompt
            or f"Document médical : {file.filename}. "
               "Fournis un résumé détaillé et des conseils liés à la drépanocytose."
        )
        summary = await call_medgemma(q)
        return {"summary": summary, "visual_description": "", "filename": file.filename}


@app.get("/api/earcp/weights")
async def earcp_weights():
    """Return current EARCP model weights (for UI polling)."""
    ensemble = get_ensemble()
    return ensemble.get_diagnostics()
