from __future__ import annotations

import asyncio
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from faster_whisper import WhisperModel


def _as_bool(value: str, default: bool) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default


@dataclass(frozen=True)
class STTConfig:
    model: str
    device: str
    compute_type: str
    beam_size: int
    vad_filter: bool
    condition_on_previous_text: bool
    concurrency: int


class STTService:
    def __init__(self) -> None:
        self.config = STTConfig(
            model=os.getenv("STT_MODEL", "small"),
            device=os.getenv("STT_DEVICE", "cuda"),
            compute_type=os.getenv("STT_COMPUTE_TYPE", "int8_float16"),
            beam_size=int(os.getenv("STT_BEAM_SIZE", "1")),
            vad_filter=_as_bool(os.getenv("STT_VAD_FILTER", "true"), default=True),
            condition_on_previous_text=_as_bool(
                os.getenv("STT_CONDITION_ON_PREVIOUS_TEXT", "false"), default=False
            ),
            concurrency=max(1, int(os.getenv("STT_CONCURRENCY", "1"))),
        )
        self._model: WhisperModel | None = None
        self._semaphore = asyncio.Semaphore(self.config.concurrency)

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            try:
                self._model = WhisperModel(
                    self.config.model,
                    device=self.config.device,
                    compute_type=self.config.compute_type,
                )
            except Exception:
                self._model = WhisperModel(
                    self.config.model,
                    device="cpu",
                    compute_type="int8",
                )
        return self._model

    def _transcribe_sync(self, path: str, language: str | None) -> dict[str, Any]:
        model = self._get_model()
        segments, info = model.transcribe(
            path,
            beam_size=self.config.beam_size,
            vad_filter=self.config.vad_filter,
            condition_on_previous_text=self.config.condition_on_previous_text,
            language=language,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "language": getattr(info, "language", None),
            "language_probability": getattr(info, "language_probability", None),
            "duration": getattr(info, "duration", None),
        }

    async def transcribe_bytes(
        self,
        *,
        audio_bytes: bytes,
        suffix: str,
        language: str | None = None,
    ) -> dict[str, Any]:
        async with self._semaphore:
            tmp_path: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = Path(tmp.name)
                return await asyncio.to_thread(
                    self._transcribe_sync,
                    str(tmp_path),
                    language,
                )
            finally:
                if tmp_path and tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)


stt_service = STTService()
