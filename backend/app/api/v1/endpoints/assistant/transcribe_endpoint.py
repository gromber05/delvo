from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.stt_service import stt_service
from .schemas import TranscriptionResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".mp4",
    ".webm",
    ".ogg",
    ".flac",
    ".aac",
}


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_endpoint(
    file: UploadFile = File(...),
    language: str | None = None,
) -> TranscriptionResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix and suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio extension: {suffix}",
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        result = await stt_service.transcribe_bytes(
            audio_bytes=audio_bytes,
            suffix=suffix or ".wav",
            language=language,
        )
        return TranscriptionResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"stt_unavailable: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"stt_error: {exc}") from exc
