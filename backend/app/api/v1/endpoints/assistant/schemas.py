"""Modelos Pydantic compartidos por los endpoints del asistente."""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Entrada de chat enviada por la app cliente al asistente."""

    message: str = Field(..., min_length=1)
    use_rag: bool = True
    history: List[Dict[str, str]] = Field(default_factory=list)
    language: str | None = None
    conversation_id: int | None = None

class ChatResponse(BaseModel):
    """Respuesta normalizada del asistente para UI y persistencia."""

    intent: str
    data: Dict[str, Any]
    message: str
    context_used: List[str]
    conversation_id: int | None = None

class TranscriptionResponse(BaseModel):
    """Resultado de transcripcion de audio con metadatos opcionales."""

    text: str
    language: str | None = None
    language_probability: float | None = None
    duration: float | None = None
