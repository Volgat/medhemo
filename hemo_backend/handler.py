"""
Hemo — RunPod Serverless Handler (Standalone)
==============================================
Point d'entrée pour RunPod Serverless.
Reçoit des jobs {"input": {"action": ..., ...}} et les dispatch vers les fonctions IA.

IMPORTANT: Ce fichier est AUTONOME — il n'importe PAS main.py ni FastAPI.
Tous les appels IA se font via l'API HuggingFace Router (HTTP), pas en local.

IMPORTANT DB: RunPod ne supporte pas IPv6. Utiliser le Connection Pooler Supabase (IPv4):
  DATABASE_URL=postgresql://postgres.drvupgxmheaevnulguih:[PWD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

Actions supportées :
  multimodal, tts, chat, health, auth_signup, auth_login, auth_status,
  billing_create-checkout-session, billing_portal, track_message, metrics_overview
"""

import os
import sys
import re
import io
import json
import asyncio
import base64
import hashlib
import logging
import tempfile
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [handler] %(levelname)s: %(message)s",
)
logger = logging.getLogger("hemo.handler")

# ── DB path: PostgreSQL pooler en prod (IPv4!), SQLite en fallback ─────────────
# IMPORTANT: RunPod ne supporte PAS IPv6.
# Utiliser le Connection Pooler Supabase (port 6543, IPv4) :
#   DATABASE_URL=postgresql://postgres.PROJECT_REF:PWD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
raw_db_url = os.environ.get("DATABASE_URL", "")
if not raw_db_url:
    os.environ["DB_PATH"] = "/tmp/hemo_users.db"
    logger.warning("DATABASE_URL not set — falling back to SQLite /tmp/hemo_users.db")
else:
    logger.info(f"DATABASE_URL set: {raw_db_url[:40]}...")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import runpod  # type: ignore

# ── DB imports ────────────────────────────────────────────────────────────────
try:
    from database import init_db, get_db, User, MessageLog, hash_password, verify_password
    from sqlalchemy.orm import Session
    from sqlalchemy import func, text
    _DB_AVAILABLE = True
except Exception as e:
    logger.error(f"DB module import error: {e}")
    _DB_AVAILABLE = False

# ── Initialisation DB (non-fatal) ─────────────────────────────────────────────
_DB_INIT_OK = False
if _DB_AVAILABLE:
    try:
        init_db()
        _DB_INIT_OK = True
        logger.info("DB initialized OK")
    except Exception as e:
        logger.error(f"DB init failed (non-fatal): {e}")
        logger.warning("Auth/metrics features will be unavailable until DB is reachable.")

# ── Config ────────────────────────────────────────────────────────────────────
HF_TOKEN       = os.getenv("HF_TOKEN", "")
MEDGEMMA_MODEL = os.getenv("HF_MEDGEMMA_MODEL", "google/gemma-3n-E4B-it")
WHISPER_MODEL  = os.getenv("HF_WHISPER_MODEL",  "openai/whisper-large-v3")
LLAVA_MODEL    = os.getenv("HF_LLAVA_MODEL",     "Qwen/Qwen2-VL-7B-Instruct")

HF_CHAT_URL    = "https://router.huggingface.co/v1/chat/completions"
HF_ROUTER_BASE = "https://router.huggingface.co/hf-inference/models"
HF_HEADERS     = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type":  "application/json",
}

STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID       = os.getenv("STRIPE_PRICE_ID", "")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://www.medhemo.com")


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _b64_to_tempfile(b64_data: str, suffix: str) -> str:
    raw = base64.b64decode(b64_data)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode="wb") as f:
        f.write(raw)
        return f.name

def _safe_unlink(path: str) -> None:
    try:
        os.unlink(path)
    except Exception:
        pass

def _get_db_session():
    if not _DB_AVAILABLE or not _DB_INIT_OK:
        raise RuntimeError(
            "La base de données est inaccessible. "
            "Vérifiez que DATABASE_URL pointe vers le Connection Pooler Supabase (port 6543, IPv4)."
        )
    return next(get_db())

def _make_system_prompt() -> str:
    return (
        "You are Hemo, a caring and versatile health assistant dedicated to providing "
        "personalized health insights and general wellness support. "
        "Your goal is to assist the user with their health questions and concerns in a natural, empathetic way. "
        "CRITICAL IDENTITY AND TOPIC RULES:\n"
        "- Your name is strictly 'Hemo'. You are an assistant, NOT a doctor.\n"
        "- You must NEVER refer to yourself as 'Dr. Hemo', 'Dr Hemo', 'Docteur Hemo', 'Doctor Hemo'.\n"
        "- You are a GENERAL health assistant. Do NOT mention sickle-cell or drépanocytose unless explicitly asked.\n\n"
        "ALWAYS detect the user's language and respond in that same language. "
        "Be clear and precise. Always remind the user to consult a healthcare professional for diagnosis."
    )

def _clean_response(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\b(Dr\.?|Doctor|Docteur)\s+Hemo\b', 'Hemo', text, flags=re.IGNORECASE)
    return text


# ─────────────────────────────────────────────────────────────────────────────
#  AI Calls — via HuggingFace Router API (HTTP, no local models)
# ─────────────────────────────────────────────────────────────────────────────

async def _call_chat(prompt: str, history: list) -> str:
    """Call the chat model via HuggingFace Router API."""
    import httpx
    messages = [{"role": "system", "content": _make_system_prompt()}]
    messages.extend(history[-8:])
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model":       MEDGEMMA_MODEL,
        "messages":    messages,
        "max_tokens":  700,
        "temperature": 0.65,
    }
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(HF_CHAT_URL, json=payload, headers=HF_HEADERS)
        if resp.status_code != 200:
            logger.error(f"Chat API {resp.status_code}: {resp.text[:300]}")
            return "Je suis désolé, le service IA est momentanément indisponible. Veuillez réessayer."
        data = resp.json()
        raw = data["choices"][0]["message"]["content"].strip()
        return _clean_response(raw)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return "Une erreur s'est produite. Veuillez réessayer dans un instant."


async def _call_whisper(audio_bytes: bytes) -> str | None:
    """Transcribe audio via HuggingFace Inference API."""
    import httpx
    url = f"{HF_ROUTER_BASE}/{WHISPER_MODEL}"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                url,
                content=audio_bytes,
                headers={"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "audio/webm"},
            )
        if resp.status_code == 200:
            return resp.json().get("text", "").strip() or None
        logger.warning(f"Whisper {resp.status_code}: {resp.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Whisper error: {e}")
        return None


async def _call_vision(image_b64: str, prompt: str) -> str | None:
    """Get visual description via HuggingFace Router API."""
    import httpx
    try:
        payload = {
            "model": LLAVA_MODEL,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt or "Describe this medical image in detail."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                ],
            }],
            "max_tokens": 500,
        }
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(HF_CHAT_URL, json=payload, headers=HF_HEADERS)
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
        logger.warning(f"Vision {resp.status_code}")
        return None
    except Exception as e:
        logger.error(f"Vision error: {e}")
        return None


async def _synthesize_tts(text: str, voice_type: str = "lila") -> bytes:
    """Generate TTS audio using edge-tts."""
    try:
        import edge_tts  # type: ignore
        from langdetect import detect  # type: ignore

        # Clean markdown for TTS
        cleaned = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        cleaned = re.sub(r'[*_`#]', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()[:1000]

        try:
            lang = detect(cleaned)
        except Exception:
            lang = "fr"

        lang_key = "fr" if lang.startswith("fr") else "en"
        VOICES = {
            "fr": {"lila": "fr-FR-DeniseNeural", "ethan": "fr-FR-HenriNeural",
                   "female1": "fr-CH-ArianeNeural", "female2": "fr-BE-CharlineNeural",
                   "male1": "fr-CA-JeanNeural",    "male2": "fr-FR-RemyMultilingualNeural"},
            "en": {"lila": "en-US-AvaNeural",    "ethan": "en-GB-ThomasNeural",
                   "female1": "en-US-EmmaNeural", "female2": "en-AU-NatashaNeural",
                   "male1": "en-US-AndrewNeural", "male2": "en-IE-ConnorNeural"},
        }
        voice_id = VOICES[lang_key].get(voice_type.lower(), VOICES[lang_key]["lila"])
        communicate = edge_tts.Communicate(cleaned, voice_id)
        audio = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        return audio
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return b""


# ─────────────────────────────────────────────────────────────────────────────
#  Action handlers
# ─────────────────────────────────────────────────────────────────────────────

async def handle_health(_job_input: dict) -> dict:
    try:
        from database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).fetchall()
            return {"status": "ok", "db_status": "connected", "result": str(res)}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


async def handle_chat(job_input: dict) -> dict:
    message = job_input.get("message", "").strip()
    history = job_input.get("history", [])
    if not message:
        return {"error": "Message cannot be empty."}
    response = await _call_chat(message, history)
    return {
        "response": response,
        "history": history + [
            {"role": "user",      "content": message},
            {"role": "assistant", "content": response},
        ],
    }


async def handle_multimodal(job_input: dict) -> dict:
    text        = job_input.get("text", "")
    history     = job_input.get("history", [])
    voice_type  = job_input.get("voice_type", "lila")
    tts_enabled = job_input.get("tts", False)
    image_b64   = job_input.get("image_b64")
    audio_b64   = job_input.get("audio_b64")

    transcription      = None
    visual_description = None

    # 1. Audio → Whisper
    if audio_b64:
        tmp_audio = _b64_to_tempfile(audio_b64, ".webm")
        try:
            with open(tmp_audio, "rb") as f:
                audio_bytes = f.read()
            transcription = await _call_whisper(audio_bytes)
            logger.info(f"Whisper: {transcription!r}")
        except Exception as e:
            logger.error(f"Audio processing: {e}")
        finally:
            _safe_unlink(tmp_audio)

    # 2. Image → Vision
    if image_b64:
        visual_description = await _call_vision(image_b64, text)
        logger.info(f"Vision: {len(visual_description or '')} chars")

    # 3. Build prompt
    prompt = text or (transcription or "Analyze this image.")
    if visual_description:
        prompt = f"[Visual description]\n{visual_description}\n\n[User]\n{prompt}"

    # 4. Chat
    ai_response = await _call_chat(prompt, history)

    # 5. Build history
    user_content = text.strip()
    if transcription:
        user_content = transcription if not user_content else f"{user_content}\n{transcription}"
    updated_history = history + [
        {"role": "user",      "content": user_content or "Analyze this medical image."},
        {"role": "assistant", "content": ai_response},
    ]

    result = {
        "response":           ai_response,
        "transcription":      transcription,
        "visual_description": visual_description,
        "earcp_weights":      {"TextExpert": 0.6, "VisionExpert": 0.2, "AudioExpert": 0.2},
        "history":            updated_history,
    }

    # 6. TTS (optional)
    if tts_enabled:
        tts_bytes = await _synthesize_tts(ai_response, voice_type)
        if tts_bytes:
            result["audio_b64"] = base64.b64encode(tts_bytes).decode()

    return result


async def handle_tts(job_input: dict) -> dict:
    text       = job_input.get("message", "").strip()
    voice_type = job_input.get("voice_type", "lila")
    if not text:
        return {"error": "Text cannot be empty."}
    audio_bytes = await _synthesize_tts(text, voice_type)
    if not audio_bytes:
        return {"error": "TTS synthesis failed."}
    return {"audio_b64": base64.b64encode(audio_bytes).decode(), "format": "mp3"}


# ── Auth handlers ─────────────────────────────────────────────────────────────

async def handle_auth_signup(job_input: dict) -> dict:
    username = job_input.get("username", "").strip()
    email    = job_input.get("email",    "").strip()
    password = job_input.get("password", "").strip()
    if not username or not email or not password:
        return {"detail": "Username, email and password are required."}
    try:
        db = _get_db_session()
        if db.query(User).filter(User.username == username).first():
            return {"detail": "Username already exists"}
        new_user = User(
            username=username, email=email,
            hashed_password=hash_password(password),
            subscription_status="inactive",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "Success", "username": new_user.username,
            "token": "signup-token",
            "subscription_status": new_user.subscription_status or "inactive",
        }
    except Exception as e:
        logger.error(f"Signup error: {e}")
        return {"detail": str(e)}


async def handle_auth_login(job_input: dict) -> dict:
    username = job_input.get("username", "").strip()
    password = job_input.get("password", "").strip()
    if not username or not password:
        return {"detail": "Username and password are required."}
    try:
        db = _get_db_session()
        user = db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.hashed_password):
            return {"detail": "Invalid credentials"}
        user.last_seen = datetime.utcnow()
        db.commit()
        return {
            "message": "Logged in", "username": user.username,
            "token": "login-token",
            "subscription_status": user.subscription_status or "inactive",
        }
    except Exception as e:
        logger.error(f"Login error: {e}")
        return {"detail": str(e)}


async def handle_auth_status(job_input: dict) -> dict:
    username = job_input.get("username", "").strip()
    if not username:
        return {"detail": "Username required"}
    try:
        db = _get_db_session()
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return {"detail": "User not found"}
        return {
            "username": user.username,
            "email": user.email,
            "subscription_status": user.subscription_status or "inactive",
        }
    except Exception as e:
        logger.error(f"Auth status error: {e}")
        return {"detail": str(e)}


# ── Billing handlers ──────────────────────────────────────────────────────────

async def handle_billing_checkout(job_input: dict) -> dict:
    username = job_input.get("username", "")
    if not STRIPE_SECRET_KEY:
        return {"detail": "Billing not configured"}
    try:
        import stripe as _stripe  # type: ignore
        _stripe.api_key = STRIPE_SECRET_KEY
        db   = _get_db_session()
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return {"detail": "User not found"}
        if not user.stripe_customer_id:
            customer = _stripe.Customer.create(email=user.email, metadata={"username": username})
            user.stripe_customer_id = customer.id
            db.commit()
        session = _stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/",
            metadata={"username": username},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Billing checkout error: {e}")
        return {"detail": str(e)}


async def handle_billing_portal(job_input: dict) -> dict:
    username = job_input.get("username", "")
    if not STRIPE_SECRET_KEY:
        return {"detail": "Billing not configured"}
    try:
        import stripe as _stripe  # type: ignore
        _stripe.api_key = STRIPE_SECRET_KEY
        db   = _get_db_session()
        user = db.query(User).filter(User.username == username).first()
        if not user or not user.stripe_customer_id:
            return {"detail": "No active billing profile found"}
        session = _stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=FRONTEND_URL,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Billing portal error: {e}")
        return {"detail": str(e)}


# ── Metrics ───────────────────────────────────────────────────────────────────

async def handle_track_message(job_input: dict) -> dict:
    username = job_input.get("username", "")
    modality = job_input.get("modality", "text")
    country  = job_input.get("country",  None)
    try:
        db  = _get_db_session()
        now = datetime.utcnow()
        if username:
            user = db.query(User).filter(User.username == username).first()
            if user:
                user.last_seen      = now
                user.total_messages = (user.total_messages or 0) + 1
                if country and not user.country:
                    user.country = country
                db.commit()
        log = MessageLog(username=username or "anonymous", modality=modality, country=country, created_at=now)
        db.add(log)
        db.commit()
        return {"tracked": True}
    except Exception as e:
        logger.error(f"track_message error: {e}")
        return {"tracked": False, "error": str(e)}


async def handle_metrics_overview(job_input: dict) -> dict:
    """Admin overview — compatible SQLite and PostgreSQL."""
    try:
        db  = _get_db_session()
        now = datetime.utcnow()
        db_url = os.environ.get("DATABASE_URL", "sqlite")
        is_postgres = "postgresql" in db_url or "postgres" in db_url

        week_ago  = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        total_users  = db.query(func.count(User.id)).scalar() or 0
        active_subs  = db.query(func.count(User.id)).filter(User.subscription_status == "active").scalar() or 0
        free_users   = total_users - active_subs
        active_7d    = db.query(func.count(User.id)).filter(User.last_seen >= week_ago).scalar() or 0
        new_30d      = db.query(func.count(User.id)).filter(User.created_at >= month_ago).scalar() or 0
        total_msgs   = db.query(func.count(MessageLog.id)).scalar() or 0
        messages_7d  = db.query(func.count(MessageLog.id)).filter(MessageLog.created_at >= week_ago).scalar() or 0

        modalities_raw = db.query(MessageLog.modality, func.count(MessageLog.id)).group_by(MessageLog.modality).all()
        modalities = {row[0]: row[1] for row in modalities_raw}

        countries_raw = (
            db.query(User.country, func.count(User.id))
            .filter(User.country != None)
            .group_by(User.country)
            .order_by(func.count(User.id).desc())
            .limit(10).all()
        )
        countries = [{"country": r[0], "users": r[1]} for r in countries_raw]

        # Date grouping — DB-specific SQL
        if is_postgres:
            ds_q = """
                SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD'),
                       COUNT(id)
                FROM users WHERE created_at >= :d GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY DATE_TRUNC('day', created_at)"""
            dm_q = """
                SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD'),
                       COUNT(id)
                FROM message_logs WHERE created_at >= :d GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY DATE_TRUNC('day', created_at)"""
            daily_signups  = [{"date": r[0], "count": r[1]} for r in db.execute(text(ds_q), {"d": month_ago}).fetchall()]
            daily_messages = [{"date": r[0], "count": r[1]} for r in db.execute(text(dm_q), {"d": month_ago}).fetchall()]
        else:
            ds_q = """SELECT strftime('%Y-%m-%d', created_at), COUNT(id)
                FROM users WHERE created_at >= :d GROUP BY strftime('%Y-%m-%d', created_at)"""
            dm_q = """SELECT strftime('%Y-%m-%d', created_at), COUNT(id)
                FROM message_logs WHERE created_at >= :d GROUP BY strftime('%Y-%m-%d', created_at)"""
            daily_signups  = [{"date": r[0], "count": r[1]} for r in db.execute(text(ds_q), {"d": month_ago.isoformat()}).fetchall()]
            daily_messages = [{"date": r[0], "count": r[1]} for r in db.execute(text(dm_q), {"d": month_ago.isoformat()}).fetchall()]

        recent_users_raw = db.query(User).order_by(User.created_at.desc()).limit(20).all()
        recent_users = [
            {
                "username":            u.username,
                "email":               u.email,
                "created_at":          u.created_at.isoformat() if u.created_at else None,
                "last_seen":           u.last_seen.isoformat() if u.last_seen else None,
                "subscription_status": u.subscription_status,
                "total_messages":      u.total_messages or 0,
                "country":             u.country or "",
                "plan":                u.subscription_status,
            }
            for u in recent_users_raw
        ]

        return {
            "total_users": total_users, "active_subs": active_subs, "free_users": free_users,
            "active_7d": active_7d, "new_30d": new_30d,
            "total_messages": total_msgs, "messages_7d": messages_7d,
            "modalities": modalities, "countries": countries,
            "daily_signups": daily_signups, "daily_messages": daily_messages,
            "recent_users": recent_users,
            "generated_at": now.isoformat(),
        }
    except Exception as e:
        logger.error(f"metrics_overview error: {e}", exc_info=True)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
#  Main dispatcher — RunPod entrypoint
# ─────────────────────────────────────────────────────────────────────────────

ACTIONS = {
    "multimodal":                      handle_multimodal,
    "tts":                             handle_tts,
    "chat":                            handle_chat,
    "health":                          handle_health,
    "auth_signup":                     handle_auth_signup,
    "auth_login":                      handle_auth_login,
    "auth_status":                     handle_auth_status,
    "billing_create-checkout-session": handle_billing_checkout,
    "billing_portal":                  handle_billing_portal,
    "track_message":                   handle_track_message,
    "metrics_overview":                handle_metrics_overview,
}


async def _dispatch(job_input: dict) -> dict:
    action = job_input.get("action", "multimodal")
    handler_fn = ACTIONS.get(action)
    if handler_fn is None:
        return {"error": f"Unknown action '{action}'."}
    logger.info(f"Dispatching action='{action}'")
    return await handler_fn(job_input)


async def handler(job: dict) -> dict:
    """RunPod asynchronous entrypoint."""
    job_input = job.get("input", {})
    try:
        return await _dispatch(job_input)
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
#  Start RunPod Serverless
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Hemo Serverless handler...")
    runpod.serverless.start({"handler": handler})
