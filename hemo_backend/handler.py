"""
Hemo — RunPod Serverless Handler
=================================
Point d'entrée pour RunPod Serverless.
Reçoit des jobs {"input": {"action": ..., ...}} et les dispatch vers les fonctions IA.

Actions supportées :
  - "multimodal"                    : pipeline unifié texte/audio/image + TTS optionnel
  - "tts"                           : synthèse vocale seule
  - "chat"                          : chat texte simple
  - "health"                        : ping de santé
  - "auth_signup"                   : inscription utilisateur
  - "auth_login"                    : connexion utilisateur
  - "auth_status"                   : statut abonnement utilisateur
  - "billing_create-checkout-session" : créer session Stripe
  - "billing_portal"                : portail de facturation Stripe
"""

import os
import sys
import asyncio
import base64
import tempfile
import logging

# ── Assure un chemin DB valide dans RunPod (/tmp est toujours disponible) ──
os.environ.setdefault("DB_PATH", "/tmp/hemo_users.db")

# Ajoute le répertoire courant au path pour retrouver les modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import runpod  # type: ignore

# Importe les fonctions core depuis main.py (FastAPI n'est PAS démarré)
from main import (
    call_medgemma,
    synthesize_tts,
    ensemble,
    MEDGEMMA_MODEL,
    LLAVA_MODEL,
    WHISPER_MODEL,
)

# Importe les helpers DB/auth
from database import init_db, get_db, User, hash_password, verify_password
from sqlalchemy.orm import Session
import stripe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [handler] %(levelname)s: %(message)s",
)
logger = logging.getLogger("hemo.handler")


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _b64_to_tempfile(b64_data: str, suffix: str) -> str:
    """Decode base64 data and write to a temp file. Returns the file path."""
    raw = base64.b64decode(b64_data)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode="wb") as f:
        f.write(raw)
        return f.name


def _safe_unlink(path: str) -> None:
    try:
        os.unlink(path)
    except Exception as e:
        logger.warning(f"Could not delete temp file {path}: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Action handlers
# ─────────────────────────────────────────────────────────────────────────────

async def handle_multimodal(job_input: dict) -> dict:
    """
    Pipeline unifié : texte + audio (Whisper) + image (vision) → MedGemma → TTS optionnel.
    """
    text        = job_input.get("text", "")
    history     = job_input.get("history", [])
    voice_type  = job_input.get("voice_type", "lila")
    tts_enabled = job_input.get("tts", False)
    image_b64   = job_input.get("image_b64")
    audio_b64   = job_input.get("audio_b64")

    transcription     = None
    visual_description = None

    # ── 1. Audio → Whisper ──────────────────────────────────────────────────
    if audio_b64:
        logger.info("Multimodal: audio input — running Whisper via EARCP")
        tmp_audio = _b64_to_tempfile(audio_b64, ".webm")
        try:
            audio_out = ensemble.process_audio(tmp_audio)
            transcription = audio_out.get("transcription")
            logger.info(f"Whisper transcription: {transcription!r}")
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
        finally:
            _safe_unlink(tmp_audio)

    # ── 2. Image → Vision ───────────────────────────────────────────────────
    if image_b64:
        logger.info("Multimodal: image input — running vision via EARCP")
        try:
            vision_out = ensemble.process_vision(image_b64, text)
            visual_description = vision_out.get("visual_description")
            logger.info(f"Vision description length: {len(visual_description or '')}")
        except Exception as e:
            logger.error(f"Vision processing failed: {e}")

    # ── 3. Build prompt ─────────────────────────────────────────────────────
    prompt = text or (transcription if transcription else "Analyze this image.")
    if visual_description:
        prompt = f"Visual description: {visual_description}\nUser: {prompt}"

    # ── 4. MedGemma ─────────────────────────────────────────────────────────
    ai_response  = await call_medgemma(prompt, history)
    earcp_weights = ensemble.get_weights()

    # ── 5. Build updated history ─────────────────────────────────────────────
    user_content = text.strip()
    if transcription:
        user_content = transcription if not user_content else f"{user_content}\n{transcription}"
    if visual_description:
        user_content += f"\n[Image analysée — {len(visual_description)} chars]"

    updated_history = history + [
        {"role": "user",      "content": user_content or "Analyze this medical image."},
        {"role": "assistant", "content": ai_response},
    ]

    result = {
        "response":           ai_response,
        "transcription":      transcription,
        "visual_description": visual_description,
        "earcp_weights":      earcp_weights,
        "history":            updated_history,
    }

    # ── 6. TTS optionnel ────────────────────────────────────────────────────
    if tts_enabled:
        logger.info(f"TTS requested — voice: {voice_type}")
        tts_bytes = await synthesize_tts(ai_response, voice_type)
        if tts_bytes:
            result["audio_b64"] = base64.b64encode(tts_bytes).decode()

    return result


async def handle_tts(job_input: dict) -> dict:
    """Synthèse vocale seule."""
    text       = job_input.get("message", "")
    voice_type = job_input.get("voice_type", "lila")

    if not text.strip():
        return {"error": "Text cannot be empty."}

    audio_bytes = await synthesize_tts(text, voice_type)
    if not audio_bytes:
        return {"error": "TTS synthesis failed."}

    return {
        "audio_b64": base64.b64encode(audio_bytes).decode(),
        "format":    "mp3",
    }


async def handle_chat(job_input: dict) -> dict:
    """Chat texte simple."""
    message = job_input.get("message", "")
    history = job_input.get("history", [])

    if not message.strip():
        return {"error": "Message cannot be empty."}

    response = await call_medgemma(message, history)
    return {
        "response": response,
        "history": history + [
            {"role": "user",      "content": message},
            {"role": "assistant", "content": response},
        ],
    }


async def handle_health(_job_input: dict) -> dict:
    """Health check."""
    return {
        "status":  "ok",
        "service": "Hemo AI Backend (RunPod Serverless)",
        "version": "3.0.0",
        "models": {
            "chat":    MEDGEMMA_MODEL,
            "vision":  LLAVA_MODEL,
            "whisper": WHISPER_MODEL,
        },
    }


# ───────────────────────────────────────────────────────────────────────────────
#  Auth handlers (signup, login, status)
# ───────────────────────────────────────────────────────────────────────────────

def _get_db_session():
    """Get a synchronous DB session (for use in sync handler context)."""
    return next(get_db())


async def handle_auth_signup(job_input: dict) -> dict:
    username = job_input.get("username", "").strip()
    email    = job_input.get("email",    "").strip()
    password = job_input.get("password", "").strip()

    if not username or not email or not password:
        return {"detail": "Username, email and password are required."}

    try:
        db = _get_db_session()
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            return {"detail": "Username already exists"}

        new_user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            subscription_status="inactive",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "Success",
            "username": new_user.username,
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
        return {
            "message": "Logged in",
            "username": user.username,
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


# ───────────────────────────────────────────────────────────────────────────────
#  Billing handlers (Stripe)
# ───────────────────────────────────────────────────────────────────────────────

async def handle_billing_checkout(job_input: dict) -> dict:
    username       = job_input.get("username", "")
    stripe_key     = os.getenv("STRIPE_SECRET_KEY", "")
    stripe_price   = os.getenv("STRIPE_PRICE_ID", "")
    frontend_url   = os.getenv("FRONTEND_URL", "https://www.medhemo.com")

    if not stripe_key:
        return {"detail": "Stripe not configured"}

    try:
        import stripe as _stripe
        _stripe.api_key = stripe_key
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
            line_items=[{"price": stripe_price, "quantity": 1}],
            mode="subscription",
            success_url=f"{frontend_url}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/",
            metadata={"username": username},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Billing checkout error: {e}")
        return {"detail": str(e)}


async def handle_billing_portal(job_input: dict) -> dict:
    username     = job_input.get("username", "")
    stripe_key   = os.getenv("STRIPE_SECRET_KEY", "")
    frontend_url = os.getenv("FRONTEND_URL", "https://www.medhemo.com")

    if not stripe_key:
        return {"detail": "Stripe not configured"}

    try:
        import stripe as _stripe
        _stripe.api_key = stripe_key
        db   = _get_db_session()
        user = db.query(User).filter(User.username == username).first()
        if not user or not user.stripe_customer_id:
            return {"detail": "No active billing profile found"}

        session = _stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=frontend_url,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Billing portal error: {e}")
        return {"detail": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
#  Main dispatcher — RunPod entrypoint
# ─────────────────────────────────────────────────────────────────────────────

ACTIONS = {
    "multimodal":                     handle_multimodal,
    "tts":                            handle_tts,
    "chat":                           handle_chat,
    "health":                         handle_health,
    # Auth
    "auth_signup":                    handle_auth_signup,
    "auth_login":                     handle_auth_login,
    "auth_status":                    handle_auth_status,
    # Billing
    "billing_create-checkout-session": handle_billing_checkout,
    "billing_portal":                  handle_billing_portal,
}


async def _dispatch(job_input: dict) -> dict:
    action = job_input.get("action", "multimodal")
    handler_fn = ACTIONS.get(action)

    if handler_fn is None:
        return {"error": f"Unknown action '{action}'. Valid actions: {list(ACTIONS.keys())}"}

    logger.info(f"Dispatching action='{action}'")
    return await handler_fn(job_input)


def handler(job: dict) -> dict:
    """RunPod synchronous entrypoint."""
    job_input = job.get("input", {})
    try:
        return asyncio.run(_dispatch(job_input))
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
#  Start RunPod Serverless
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting Hemo RunPod Serverless handler...")
    runpod.serverless.start({"handler": handler})
