"""
earcp_orchestrator.py
─────────────────────
EARCP-based ensemble orchestrator for Hemo AI.

Wraps the three Hemo models as EARCP-compatible experts:
  - TextExpert  → MedGemma (language model)
  - VisionExpert → LLaVA  (visual description)
  - AudioExpert  → Whisper (speech-to-text)

The HemoEnsemble uses EARCP to dynamically weight each expert's
contribution based on their per-turn coherence and performance,
giving Dr. Hemo the best possible multimodal response.
"""

from __future__ import annotations

import os
import io
import logging
import math
import numpy as np
from typing import Any

logger = logging.getLogger("hemo.earcp")

# ─────────────────────────────────────────────────────────────────────────────
# Minimal EARCP-compatible adapter base class
# ─────────────────────────────────────────────────────────────────────────────

class BaseExpert:
    """Minimal interface required by EARCP: .predict(x) → array-like."""

    name: str = "base"

    def predict(self, x: Any) -> np.ndarray:
        raise NotImplementedError

    def __repr__(self):
        return f"<{self.__class__.__name__}>"


# ─────────────────────────────────────────────────────────────────────────────
# Concrete experts (synchronous wrappers — async calls happen in main.py)
# These return normalized confidence scalars used by EARCP for weight update.
# ─────────────────────────────────────────────────────────────────────────────

class TextExpert(BaseExpert):
    """
    Wraps MedGemma text model.
    predict() receives a dict with response_length (normalised to [0,1])
    and returns a confidence signal.
    """
    name = "TextExpert"

    def predict(self, x: dict) -> np.ndarray:
        # x = {"response_len": int, "has_response": bool}
        has_resp  = float(x.get("has_response", True))
        resp_len  = min(x.get("response_len", 200), 700) / 700.0
        # Signal: high when we got a real, long response
        signal = has_resp * (0.4 + 0.6 * resp_len)
        return np.array([signal])


class VisionExpert(BaseExpert):
    """
    Wraps LLaVA visual description.
    predict() receives a dict with description_length.
    """
    name = "VisionExpert"

    def predict(self, x: dict) -> np.ndarray:
        has_img   = float(x.get("has_image", False))
        desc_len  = min(x.get("description_len", 0), 400) / 400.0
        signal = has_img * (0.3 + 0.7 * desc_len)
        return np.array([signal])


class AudioExpert(BaseExpert):
    """
    Wraps Whisper speech-to-text.
    predict() receives a dict with transcription_length.
    """
    name = "AudioExpert"

    def predict(self, x: dict) -> np.ndarray:
        has_audio  = float(x.get("has_audio", False))
        trans_len  = min(x.get("transcription_len", 0), 300) / 300.0
        signal = has_audio * (0.3 + 0.7 * trans_len)
        return np.array([signal])


# ─────────────────────────────────────────────────────────────────────────────
# EARCP wrapper — thin adaptor around the earcp.EARCP class
# ─────────────────────────────────────────────────────────────────────────────

class HemoEnsemble:
    """
    Ensemble orchestrator using EARCP to dynamically weight
    TextExpert, VisionExpert, and AudioExpert.

    Usage:
        ensemble = HemoEnsemble()
        weights  = ensemble.get_weights()
        ...
        ensemble.update(signals, target_signal)
        diag = ensemble.get_diagnostics()
    """

    def __init__(self):
        self.experts = [TextExpert(), VisionExpert(), AudioExpert()]
        self._n = len(self.experts)

        # Try to use EARCP library; fall back to manual implementation if needed
        try:
            from earcp import EARCP  # type: ignore
            self._earcp = EARCP(
                experts=self.experts,
                alpha_P=0.9,    # Performance smoothing
                alpha_C=0.85,   # Coherence smoothing
                beta=0.7,       # Performance-coherence balance
                eta_s=5.0,      # Weight sensitivity
                w_min=0.05,     # Weight floor (each expert always has some say)
            )
            self._use_earcp = True
            logger.info("EARCP library loaded successfully ✓")
        except Exception as e:
            logger.warning(f"EARCP import failed ({e}); using fallback EMA weighting")
            self._use_earcp = False
            # Fallback: simple EMA-based weights
            self._weights = np.ones(self._n) / self._n
            self._perf    = np.ones(self._n) * 0.5
            self._alpha   = 0.9
            self._w_min   = 0.05

    # ── Multimodal Processing Logic ───────────────────────────────────────────

    def process_audio(self, audio_path: str) -> dict:
        """Transcribe audio using Whisper."""
        try:
            import httpx
            with open(audio_path, "rb") as f:
                data = f.read()
            # Use environment variables if possible, otherwise hardcoded defaults
            whisper_model = os.getenv("HF_WHISPER_MODEL", "openai/whisper-large-v3")
            url = f"https://router.huggingface.co/hf-inference/models/{whisper_model}"
            
            hf_token = os.getenv("HF_TOKEN")
            headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
            
            resp = httpx.post(url, content=data, headers={**headers, "Content-Type": "audio/webm"}, timeout=60)
            if resp.status_code == 200:
                return {"transcription": resp.json().get("text", "").strip()}
            return {"transcription": None}
        except Exception as e:
            logger.error(f"Whisper exception: {e}")
            return {"transcription": None}

    def process_vision(self, image_b64: str, prompt: str) -> dict:
        """Get visual description using Qwen-VL (Uniform Mode)."""
        try:
            import httpx
            vision_model = os.getenv("HF_LLAVA_MODEL", "Qwen/Qwen2-VL-7B-Instruct")
            url = "https://router.huggingface.co/v1/chat/completions"
            
            hf_token = os.getenv("HF_TOKEN")
            headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
            
            payload = {
                "model": vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt or "Describe this medical image."},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
                        ]
                    }
                ],
                "max_tokens": 500
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                desc = data['choices'][0]['message']['content']
                return {"visual_description": desc}
            return {"visual_description": f"Analysis failed ({resp.status_code})."}
        except Exception as e:
            logger.error(f"Vision exception: {e}")
            return {"visual_description": "Analysis failed."}

    # ── Public API ────────────────────────────────────────────────────────────


    def observe(self, signals: dict) -> dict[str, float]:
        """
        Run each expert's predict() on relevant signals.
        Returns dict: expert_name → predicted_signal value.
        Signals keys: response_len, has_response, has_image, description_len,
                      has_audio, transcription_len
        """
        results = {}
        for expert in self.experts:
            pred = expert.predict(signals)[0]
            results[expert.name] = float(pred)
        return results

    def update(self, expert_signals: dict[str, float], target: float = 1.0):
        """
        Update EARCP weights based on how each expert performed.
        target: idealised signal value (default 1.0 = perfect).
        """
        preds_array = np.array([expert_signals.get(e.name, 0.5) for e in self.experts])

        if self._use_earcp:
            try:
                self._earcp.update(
                    [np.array([v]) for v in preds_array],
                    np.array([target]),
                )
            except Exception as ex:
                logger.debug(f"EARCP update error: {ex}")
                self._fallback_update(preds_array, target)
        else:
            self._fallback_update(preds_array, target)

    def get_weights(self) -> dict[str, float]:
        """Return current expert weights as percentages (0–1)."""
        if self._use_earcp:
            try:
                diag = self._earcp.get_diagnostics()
                raw  = diag.get("weights", np.ones(self._n) / self._n)
                raw  = np.array(raw, dtype=float)
            except Exception:
                raw = np.ones(self._n) / self._n
        else:
            raw = self._weights.copy()

        # Normalise to sum=1
        total = raw.sum()
        if total > 0:
            raw = raw / total

        return {e.name: float(w) for e, w in zip(self.experts, raw)}

    def get_diagnostics(self) -> dict:
        """Extended diagnostics including weights + performance."""
        weights = self.get_weights()
        return {
            "weights": weights,
            "experts": [e.name for e in self.experts],
            "earcp_active": self._use_earcp,
        }

    # ── Fallback EMA ──────────────────────────────────────────────────────────

    def _fallback_update(self, preds: np.ndarray, target: float):
        """Simple exponential moving average weight update."""
        errors = np.abs(preds - target)
        perf   = 1.0 - errors  # Higher = better
        self._perf = self._alpha * self._perf + (1 - self._alpha) * perf

        # Softmax-like normalisation with floor
        exp_perf = np.exp(self._perf * 5.0)
        w_raw    = exp_perf / exp_perf.sum()
        # Apply floor
        w_floor  = np.maximum(w_raw, self._w_min)
        self._weights = w_floor / w_floor.sum()


# ── Singleton ─────────────────────────────────────────────────────────────────
_ensemble: HemoEnsemble | None = None


def get_ensemble() -> HemoEnsemble:
    global _ensemble
    if _ensemble is None:
        _ensemble = HemoEnsemble()
    return _ensemble
