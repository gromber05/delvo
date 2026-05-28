from __future__ import annotations
import re
from fastapi import APIRouter, BackgroundTasks, Depends
from app.db.postgresql.conversation_repository import (
    add_message,
    create_conversation,
    get_conversation,
    touch_conversation,
    update_message_sentiment,
)
from .dependencies import get_authenticated_user_id_optional
from .schemas import ChatRequest, ChatResponse
from .service import assistant_chat

router = APIRouter()

_POSITIVE_WORDS = re.compile(
    r"\b(gracias|perfecto|genial|bien|excelente|great|thanks|perfect|awesome|good|nice|love|"
    r"estupendo|increible|incredible|fantástico|fantastico|maravilloso|helpful|útil|util)\b",
    re.IGNORECASE,
)
_NEGATIVE_WORDS = re.compile(
    r"\b(error|problema|fallo|falla|no funciona|broken|wrong|mal|terrible|horrible|"
    r"doesn't work|not working|frustr|molest|imposible|impossible|lento|slow|crash)\b",
    re.IGNORECASE,
)

def _classify_sentiment(text: str) -> str:
    pos = len(_POSITIVE_WORDS.findall(text))
    neg = len(_NEGATIVE_WORDS.findall(text))
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"

def _persist_turn(
    *,
    conversation_id: int,
    user_message: str,
    assistant_message: str,
    intent: str,
) -> None:
    sentiment = _classify_sentiment(user_message)
    add_message(
        conversation_id=conversation_id,
        role="user",
        content=user_message,
        sentiment=sentiment,
    )
    add_message(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_message,
        intent=intent,
    )
    touch_conversation(conversation_id=conversation_id)

def _get_or_create_conversation(
    *,
    user_id: int,
    conversation_id: int | None,
    first_message: str,
) -> int:
    if conversation_id is not None:
        existing = get_conversation(conversation_id=conversation_id, user_id=user_id)
        if existing:
            return conversation_id

    title = first_message[:80] if first_message else "Conversación"
    conv = create_conversation(user_id=user_id, title=title)
    return int(conv["id"])

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    user_id: int | None = Depends(get_authenticated_user_id_optional),
) -> ChatResponse:
    response = assistant_chat(payload=payload, user_id=user_id)

    if user_id is not None:
        conv_id = _get_or_create_conversation(
            user_id=user_id,
            conversation_id=payload.conversation_id,
            first_message=payload.message,
        )
        background_tasks.add_task(
            _persist_turn,
            conversation_id=conv_id,
            user_message=payload.message,
            assistant_message=response.message,
            intent=response.intent,
        )
        return ChatResponse(
            intent=response.intent,
            data=response.data,
            message=response.message,
            context_used=response.context_used,
            conversation_id=conv_id,
        )

    return response
