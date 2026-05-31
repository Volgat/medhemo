"""
Hemo — RunPod Serverless Handler
=================================
Point d'entrée pour RunPod Serverless.
Reçoit des jobs {"input": {"action": ..., ...}} et les dispatch vers les fonctions IA.

Actions supportées :
  - "multimodal"  : pipeline unifié texte/audio/image + TTS optionnel
  - "tts"         : synthèse vocale seule
  - "chat"        : chat texte simple
  - "health"      : ping de santé
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


# ─────────────────────────────────────────────────────────────────────────────
#  Main dispatcher — RunPod entrypoint
# ─────────────────────────────────────────────────────────────────────────────

ACTIONS = {
    "multimodal": handle_multimodal,
    "tts":        handle_tts,
    "chat":       handle_chat,
    "health":     handle_health,
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
