from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.v1.dependencies import get_required_user_id
from app.db.postgresql.conversation_repository import (
    create_conversation,
    delete_conversation,
    get_conversation,
    list_conversations,
    list_messages,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    title: str = Field(default="Nueva conversación", max_length=255)


@router.get("/")
def list_conversations_endpoint(
    user_id: int = Depends(get_required_user_id),
) -> dict[str, Any]:
    return {"items": list_conversations(user_id=user_id)}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_conversation_endpoint(
    body: CreateConversationRequest,
    user_id: int = Depends(get_required_user_id),
) -> dict[str, Any]:
    conv = create_conversation(user_id=user_id, title=body.title)
    return {"item": conv}


@router.get("/{conversation_id}")
def get_conversation_endpoint(
    conversation_id: int,
    user_id: int = Depends(get_required_user_id),
) -> dict[str, Any]:
    conv = get_conversation(conversation_id=conversation_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    messages = list_messages(conversation_id=conversation_id)
    return {"item": {**conv, "messages": messages}}


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation_endpoint(
    conversation_id: int,
    user_id: int = Depends(get_required_user_id),
) -> dict[str, Any]:
    deleted = delete_conversation(conversation_id=conversation_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return {"ok": True}
