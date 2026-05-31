import os
import io
import json
import base64
import logging

from dotenv import load_dotenv  # type: ignore
import httpx  # type: ignore
import stripe  # type: ignore
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Depends, Request  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel, EmailStr  # type: ignore
from PIL import Image  # type: ignore
from sqlalchemy.orm import Session
from database import init_db, get_db, User, hash_password, verify_password
from earcp_orchestrator import get_ensemble


load_dotenv()

# ── Stripe Config ────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "price_1T_placeholder")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("hemo")

# ── Config ───────────────────────────────────────────────────────────────────
HF_TOKEN       = os.getenv("HF_TOKEN", "")
# Chat/LLM model — served via SambaNova inference provider (supports open LLMs)
MEDGEMMA_MODEL = os.getenv("HF_MEDGEMMA_MODEL", "google/medgemma-4b-it")
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

# CORS: local dev + domaine de prod via variable d'env ALLOWED_ORIGINS
# Ex. en prod: ALLOWED_ORIGINS=https://medhemo.com,https://app.medhemo.com
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:3000", "http://127.0.0.1:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB
init_db()

# Lightweight Ensemble Orchestrator
ensemble = get_ensemble()
logger.info("Ensemble orchestrator initialized.")


@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Hemo AI Backend is running successfully.",
        "version": "3.0.0",
        "api_docs": "/docs"
    }


@app.get("/ping")
async def ping():
    return {"status": "healthy"}


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    username: str

class PortalRequest(BaseModel):
    username: str

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    voice_type: str = "lila"
    username: str = ""

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
    subscription_status: str = "inactive"

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

def make_system_prompt() -> str:
    return (
        "You are Hemo, a caring and versatile health assistant dedicated to providing "
        "personalized health insights and general wellness support. "
        "Your goal is to assist the user with their health questions and concerns in a natural, empathetic way. "
        "CRITICAL IDENTITY AND TOPIC RULES:\n"
        "- Your name is strictly 'Hemo'. You are an assistant, NOT a doctor.\n"
        "- You must NEVER refer to yourself as 'Dr. Hemo', 'Dr Hemo', 'Docteur Hemo', 'Doctor Hemo', or assume any medical doctor title.\n"
        "- If introducing yourself, you must say only 'Hemo' (e.g. 'I am Hemo' / 'Je suis Hemo') and never use 'Dr.' or 'Doctor' or 'Docteur' as a prefix.\n"
        "- You are a GENERAL health assistant, not a specialized sickle-cell (drépanocytose) assistant. "
        "Do NOT mention or bring up 'sickle-cell' or 'drépanocytose' unless the user explicitly asks about it first.\n\n"
        "Only introduce yourself when it is appropriate to do so (like at the start of a conversation "
        "or if the user asks who you are). Vary your greeting and introduction phrases to avoid being repetitive. "
        "ALWAYS detect the user's language based on their input and respond in that same language. "
        "If they speak French, reply in French. If they speak English, reply in English. "
        "Be clear and precise. Structure your answers if necessary (lists, steps). "
        "Always remind the user to consult a healthcare professional for any medical diagnosis or treatment."
    )

def clean_ai_response(text: str, user_prompt: str) -> str:
    if not text:
        return ""
    import re

    # 1. Replace Dr. Hemo / Docteur Hemo / Doctor Hemo with Hemo (case-insensitive)
    text = re.sub(r'\b(Dr\.?|Doctor|Docteur)\s+Hemo\b', 'Hemo', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(docteur|doctor)\s+Hemo\b', 'Hemo', text, flags=re.IGNORECASE)

    # 2. Check if the user's prompt mentions sickle-cell/drépanocytose
    user_mentioned = False
    if user_prompt:
        prompt_lower = user_prompt.lower()
        keywords = ["drépanocytose", "drepanocytose", "falciforme", "sickle", "globules rouges", "anémie"]
        user_mentioned = any(kw in prompt_lower for kw in keywords)
        
    if not user_mentioned:
        # Clean up unsolicited sickle-cell/drépanocytose introductory phrases in French
        text = re.sub(r'concernant la drépanocytose \s*\(anémie falciforme\)\s* et', 'concernant', text, flags=re.IGNORECASE)
        text = re.sub(r'concernant la drépanocytose et', 'concernant', text, flags=re.IGNORECASE)
        text = re.sub(r'spécialisé dans la drépanocytose \s*\(anémie falciforme\)\s* et la santé générale', 'dédié à la santé générale', text, flags=re.IGNORECASE)
        text = re.sub(r'spécialisé dans la drépanocytose et la santé générale', 'dédié à la santé générale', text, flags=re.IGNORECASE)
        text = re.sub(r'assistant médical spécialisé dans la drépanocytose\b', 'assistant de santé', text, flags=re.IGNORECASE)
        text = re.sub(r'spécialisé dans la drépanocytose\b', 'dédié à la santé', text, flags=re.IGNORECASE)
        text = re.sub(r'sur la drépanocytose \s*\(anémie falciforme\)\s* et', 'sur', text, flags=re.IGNORECASE)
        text = re.sub(r'sur la drépanocytose et', 'sur', text, flags=re.IGNORECASE)
        
        # English patterns
        text = re.sub(r'regarding sickle-cell \s*\(sickle cell anemia\)\s* and', 'regarding', text, flags=re.IGNORECASE)
        text = re.sub(r'regarding sickle-cell and', 'regarding', text, flags=re.IGNORECASE)
        text = re.sub(r'specialized in sickle-cell \s*\(sickle cell anemia\)\s* and general health', 'dedicated to general health', text, flags=re.IGNORECASE)
        text = re.sub(r'specialized in sickle-cell and general health', 'dedicated to general health', text, flags=re.IGNORECASE)

    return text

# ── Core AI helpers ───────────────────────────────────────────────────────────

async def call_medgemma(prompt: str, history: list[dict] | None = None) -> str:
    if history is None:
        history = []

    system = make_system_prompt()
    messages = [{"role": "system", "content": system}]
    for turn in history[-10:]:
        messages.append(turn)

    # Prepend strict identity and topic reminders to prevent fine-tune biases
    identity_reminder = (
        "[Strict identity reminder: Your name is Hemo. You are an assistant, NOT a doctor. "
        "Do NOT call yourself Dr. Hemo or Docteur Hemo. Do NOT mention sickle-cell or drépanocytose "
        "unless the user explicitly asked about it in their message.]\n\n"
    )
    messages.append({"role": "user", "content": identity_reminder + prompt})

    payload = {
        "model": MEDGEMMA_MODEL,
        "messages": messages,
        "max_tokens": 700,
        "temperature": 0.65,
    }

    url = HF_CHAT_URL
    logger.info(f"→ Chat Model: {MEDGEMMA_MODEL} | URL: {url}")
    logger.info(f"→ Payload: {json.dumps(payload)}")
    logger.info(f"→ Headers (masked): { {k: (v[:10] + '...') if k == 'Authorization' else v for k, v in HEADERS.items()} }")
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(url, json=payload, headers=HEADERS)

    if resp.status_code != 200:
        logger.error(f"MedGemma/Gemma-3 {resp.status_code}: {resp.text[:200]}")
        return "I'm sorry, the AI service is temporarily unavailable. Please try again."

    data = resp.json()
    response = data["choices"][0]["message"]["content"].strip()
    return clean_ai_response(response, prompt)


async def call_medgemma_stream(prompt: str, history: list[dict] | None = None):
    if history is None:
        history = []

    system = make_system_prompt()
    messages = [{"role": "system", "content": system}]
    for turn in history[-10:]:
        messages.append(turn)

    identity_reminder = (
        "[Strict identity reminder: Your name is Hemo. You are an assistant, NOT a doctor. "
        "Do NOT call yourself Dr. Hemo or Docteur Hemo. Do NOT mention sickle-cell or drépanocytose "
        "unless the user explicitly asked about it in their message.]\n\n"
    )
    messages.append({"role": "user", "content": identity_reminder + prompt})

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
                        # Post-process streamed chunk if delta is outputted (raw stream is cleaned at user prefix reminder, 
                        # but we still track full text)
                        full_text += delta
                        yield f"data: {json.dumps({'delta': delta, 'done': False})}\n\n"
                except Exception:
                    pass

    cleaned_full = clean_ai_response(full_text, prompt)
    yield f"data: {json.dumps({'delta': '', 'done': True, 'full': cleaned_full})}\n\n"


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
    voice_type: str = "female1",
) -> tuple[str, str]:
    if history is None:
        history = []

    visual_description = await call_llava_description(image_bytes)

    if visual_description:
        medgemma_prompt = (
            f"[VISUAL DESCRIPTION OF THE IMAGE]\n{visual_description}\n\n"
            f"[USER QUESTION]\n{user_question}\n\n"
            f"As Hemo, provide an in-depth health analysis of this image "
            "based on the visual description above. "
            "Identify relevant medical elements, explain what they mean "
            "in the context of general health, and give practical advice. "
            "Structure your response clearly."
        )
    else:
        medgemma_prompt = (
            f"[Medical image submitted — visual analysis unavailable]\n"
            f"[USER QUESTION]\n{user_question}\n\n"
            "Answer the user's medical question even without access to the image. "
            "Ask them to describe what they see if possible."
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


async def synthesize_tts(text: str, voice_type: str = "lila") -> bytes:
    """
    Generate high-quality TTS audio with auto-language detection.
    Supports 6 voices: lila, ethan, female1, male1, female2, male2.
    Uses edge-tts for speed and high-quality neural voices.
    """
    try:
        import edge_tts
        from langdetect import detect
        import re

        # Clean the text for TTS (remove markdown formatting, list bullets, etc.)
        cleaned_text = text
        if cleaned_text:
            # 1. Remove markdown links: [label](url) -> label
            cleaned_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned_text)
            
            # Remove parentheses, brackets, and braces to prevent spoken artifacts (e.g. reading "ouvrir la parenthèse")
            cleaned_text = cleaned_text.replace('(', ' ').replace(')', ' ')
            cleaned_text = cleaned_text.replace('[', ' ').replace(']', ' ')
            cleaned_text = cleaned_text.replace('{', ' ').replace('}', ' ')
            
            # 2. Remove markdown headers: #, ##, ###, etc. at the start of a line
            cleaned_text = re.sub(r'(?m)^#+\s*', '', cleaned_text)
            
            # 3. Remove bold / italics markdown markers: **, *, __, _
            cleaned_text = cleaned_text.replace('**', '').replace('__', '')
            cleaned_text = cleaned_text.replace('*', '')
            cleaned_text = cleaned_text.replace('_', ' ')
            cleaned_text = cleaned_text.replace('`', '')
            
            # 4. Remove bullet points at the beginning of a line or after spaces
            cleaned_text = re.sub(r'(?m)^[-+]\s+', '', cleaned_text)
            cleaned_text = re.sub(r'\s+[-+]\s+', ' ', cleaned_text)
            
            # 5. Clean up extra whitespaces/newlines
            cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

        # Robust language detection
        try:
            lang = detect(cleaned_text)
        except Exception:
            lang = "fr"
        
        # Mapping voices to edge-tts neural voices
        # We select the most "natural" sounding ones available in edge-tts
        # for both major languages (EN/FR).
        voice_map = {
            "fr": {
                "lila":    "fr-FR-DeniseNeural",
                "ethan":   "fr-FR-HenriNeural",
                "female1": "fr-CH-ArianeNeural",
                "female2": "fr-BE-CharlineNeural",
                "male1":   "fr-CA-JeanNeural",
                "male2":   "fr-FR-RemyMultilingualNeural",
            },
            "en": {
                "lila":    "en-US-AvaNeural",
                "ethan":   "en-GB-ThomasNeural",
                "female1": "en-US-EmmaNeural",
                "female2": "en-AU-NatashaNeural",
                "male1":   "en-US-AndrewNeural",
                "male2":   "en-IE-ConnorNeural",
            }
        }

        # Fallback to English if language not supported
        lang_key = "fr" if lang.startswith("fr") else "en"
        voices_for_lang = voice_map.get(lang_key, voice_map["en"])
        
        # Select voice_id
        voice_id = voices_for_lang.get(voice_type.lower(), voices_for_lang["lila"])

        # Create audio stream
        communicate = edge_tts.Communicate(cleaned_text[:1000], voice_id)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        logger.info(f"TTS generated for '{voice_type}' in '{lang_key}' ({len(audio_data)} bytes)")
        return audio_data

    except Exception as e:
        logger.error(f"TTS Synthesis Error: {e}")
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
        hashed_password=hash_password(user_data.password),
        subscription_status="inactive"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": "Success",
        "username": new_user.username,
        "token": "signup-token",
        "subscription_status": new_user.subscription_status or "inactive"
    }

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Logged in",
        "username": user.username,
        "token": "login-token",
        "subscription_status": user.subscription_status or "inactive"
    }

@app.get("/api/auth/status")
async def get_user_status(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": user.username,
        "email": user.email,
        "subscription_status": user.subscription_status or "inactive",
    }

@app.post("/api/billing/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY is not configured")
        raise HTTPException(status_code=500, detail="Billing system configuration error")
    
    if not user.stripe_customer_id:
        try:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"username": user.username}
            )
            user.stripe_customer_id = customer.id
            db.commit()
        except Exception as e:
            logger.error(f"Stripe Customer creation error: {e}")
            raise HTTPException(status_code=500, detail="Failed to create Stripe customer")
    
    try:
        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/",
            metadata={"username": user.username}
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/billing/portal")
async def create_portal_session(req: PortalRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active billing profile found for this user")
        
    try:
        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=FRONTEND_URL
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe Portal Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        # During local testing, we might want a fallback if verifying is not possible, 
        # but to be secure we should enforce it.
        raise HTTPException(status_code=500, detail="Webhook verification secret not configured")
        
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error("Invalid Stripe webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error("Invalid Stripe signature verification")
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    event_type = event["type"]
    logger.info(f"Received Stripe webhook event: {event_type}")
    
    data_object = event["data"]["object"]
    
    if event_type == "checkout.session.completed":
        session = data_object
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        username = session.get("metadata", {}).get("username")
        
        user = None
        if username:
            user = db.query(User).filter(User.username == username).first()
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            
        if user:
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            user.subscription_status = "active"
            db.commit()
            logger.info(f"User {user.username} subscription activated via checkout session")
        else:
            logger.warning(f"No user found for customer_id: {customer_id} or username: {username}")
            
    elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
        subscription = data_object
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        subscription_id = subscription.get("id")
        
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.stripe_subscription_id = subscription_id
            if status in ["active", "trialing"]:
                user.subscription_status = "active"
            else:
                user.subscription_status = "inactive"
            db.commit()
            logger.info(f"User {user.username} subscription status updated to: {status}")
        else:
            logger.warning(f"No user found for customer_id: {customer_id}")
            
    elif event_type == "invoice.payment_failed":
        invoice = data_object
        customer_id = invoice.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.subscription_status = "inactive"
            db.commit()
            logger.info(f"User {user.username} subscription set to inactive (invoice.payment_failed)")
            
    return {"status": "success"}

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


def check_premium_access(username: str, db: Session) -> None:
    if not username:
        raise HTTPException(status_code=403, detail="Authentication required")
    user = db.query(User).filter(User.username == username).first()
    if not user or user.subscription_status != "active":
        raise HTTPException(status_code=403, detail="Premium subscription required")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Standard text chat with conversation history."""
    logger.info(f"Chat: {req.message[:80]!r}")
    response = await call_medgemma(req.message, req.history)
    return {"response": response}


@app.get("/api/chat/stream")
async def chat_stream(message: str, history_json: str = "[]", username: str = "", db: Session = Depends(get_db)):
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
    username: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """Voice input: audio → Whisper → MedGemma → response."""
    check_premium_access(username, db)
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
    prompt: str = Form(default="Analyze this medical image."),
    history_json: str = Form(default="[]"),
    username: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """Multimodal image analysis: LLaVA + MedGemma."""
    check_premium_access(username, db)
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
        f"**Visual Analysis:**\n{visual_description}\n\n**Medical Analysis:**\n{medical_analysis}"
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
    Convert text to speech.
    Returns MP3 audio bytes as base64 in JSON for easy frontend use.
    """
    text = req.message
    voice_type = req.voice_type
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    # We use synthesize_tts which now handles lang detection and 6-voice mapping
    audio_bytes = await synthesize_tts(text, voice_type=voice_type)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="TTS synthesis failed.")

    audio_b64 = base64.b64encode(audio_bytes).decode()
    return {"audio_b64": audio_b64, "format": "mp3"}


@app.post("/api/multimodal", response_model=MultimodalResponse)
async def multimodal_unified(
    text: str = Form(default=""),
    history_json: str = Form(default="[]"),
    tts: str = Form(default="false"),
    voice_type: str = Form(default="lila"),
    image: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    username: str = Form(default=""),
    db: Session = Depends(get_db),
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
    if image is not None or audio is not None:
        check_premium_access(username, db)
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
        try:
            image_bytes = await image.read()
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            max_side = 768
            w, h = img.size
            if max(w, h) > max_side:
                scale = max_side / max(w, h)
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=80)
            image_b64 = base64.b64encode(buf.getvalue()).decode()
            logger.info(f"Multimodal image processed & compressed. Base64 length: {len(image_b64)}")
        except Exception as e:
            logger.error(f"Error processing image in multimodal: {e}")
            image_b64 = None

    # ── Execute the Unified Hemo Orchestration ──────────────────────────────
    logger.info("Executing Hemo multimodal orchestration...")
    
    transcription = None
    if audio is not None:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False, mode='wb') as f:
            f.write(audio_bytes)
            f_name = f.name
        # On Windows, we must close the file handle before another process/thread opens it.
        audio_out = ensemble.process_audio(f_name)
        transcription = audio_out.get("transcription")
        try:
            os.unlink(f_name)
        except Exception as e:
            logger.warning(f"Failed to unlink temp file {f_name}: {e}")

    visual_description = None
    if image is not None and image_b64 is not None:
        vision_out = ensemble.process_vision(image_b64, text)
        visual_description = vision_out.get("visual_description")

    # Generate final response
    prompt = text or (transcription if transcription else "Analyze this image.")
    if visual_description:
        prompt = f"Visual description: {visual_description}\nUser: {prompt}"

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
        {"role": "user", "content": user_content or "Analyze this medical image."},
        {"role": "assistant", "content": ai_response},
    ]

    # ── Step 6: Optional TTS ──────────────────────────────────────────────────
    audio_b64_res = None
    if tts.lower() == "true":
        tts_bytes = await synthesize_tts(ai_response, voice_type=voice_type)
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
    username: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """Analyse a medical document (PDF/image)."""
    check_premium_access(username, db)
    content_type = file.content_type or ""
    file_bytes = await file.read()

    if "image" in content_type:
        q = prompt or "Analyze this medical document and provide a clear summary with key points."
        visual_desc, medical = await call_multimodal_analysis(file_bytes, q, voice_type="female1")
        return {"summary": medical, "visual_description": visual_desc, "filename": file.filename}
    
    # PDF/Document handling
    q = prompt or "Medical document: {file.filename}. Provide a detailed summary."
    summary = await call_medgemma(q)
    return {"summary": summary, "visual_description": "", "filename": file.filename}


@app.get("/api/earcp/weights")
async def earcp_weights():
    """Return current EARCP model weights (for UI polling)."""
    ensemble = get_ensemble()
    return ensemble.get_diagnostics()
