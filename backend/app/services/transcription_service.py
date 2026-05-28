from __future__ import annotations
import os
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from faster_whisper import WhisperModel

_model: WhisperModel | None = None

def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        size = os.environ.get("WHISPER_MODEL", "base")
        _model = WhisperModel(size, device="cpu", compute_type="int8")
    return _model

def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = _get_model()
        segments, _ = model.transcribe(tmp_path, language="es", beam_size=5)
        return " ".join(seg.text for seg in segments).strip()
    finally:
        Path(tmp_path).unlink(missing_ok=True)
