from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.security import get_authenticated_user_id
from app.services.transcription_service import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    file: UploadFile,
    _: int = Depends(get_authenticated_user_id),
) -> dict[str, str]:
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archivo de audio vacío")
    try:
        text = transcribe_audio(audio_bytes, file.filename or "audio.m4a")
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return {"text": text}
