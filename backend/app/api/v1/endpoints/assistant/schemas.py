from typing import Any, Dict, List

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    use_rag: bool = True
    history: List[Dict[str, str]] = Field(default_factory=list)
    language: str | None = None


class ChatResponse(BaseModel):
    intent: str
    data: Dict[str, Any]
    message: str
    context_used: List[str]


class TranscriptionResponse(BaseModel):
    text: str
    language: str | None = None
    language_probability: float | None = None
    duration: float | None = None
