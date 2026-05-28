from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func

from app.api.v1.dependencies import require_admin
from app.db.models import Conversation, Message, User, _to_dict, get_session
from app.db.postgresql.conversation_repository import get_admin_stats, list_messages
from app.db.postgresql.conversation_repository import list_conversations as list_all_conversations_for_user
from app.db.postgresql.user_repository import get_all_users, get_user_by_id, update_user_role

router = APIRouter(prefix="/admin", tags=["admin"])


class UpdateRoleRequest(BaseModel):
    role: str


@router.get("/stats")
def admin_stats(
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    return get_admin_stats()


@router.get("/users")
def admin_list_users(
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    return {"items": get_all_users()}


@router.put("/users/{user_id}/role")
def admin_update_role(
    user_id: int,
    body: UpdateRoleRequest,
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Rol invalido. Usa 'user' o 'admin'.")
    updated = update_user_role(user_id=user_id, role=body.role)
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user = get_user_by_id(user_id)
    return {"ok": True, "user": {"id": user["id"], "email": user["email"], "role": user["role"]}}


@router.get("/conversations")
def admin_list_conversations(
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    with get_session() as session:
        rows = (
            session.query(
                Conversation,
                User.name.label("user_name"),
                User.email.label("user_email"),
                func.count(Message.id).label("message_count"),
            )
            .join(User, User.id == Conversation.user_id)
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .group_by(Conversation.id, User.name, User.email)
            .order_by(Conversation.updated_at.desc())
            .limit(200)
            .all()
        )
        items = []
        for conv, user_name, user_email, message_count in rows:
            d = _to_dict(conv)
            d["user_name"] = user_name
            d["user_email"] = user_email
            d["message_count"] = message_count
            items.append(d)
    return {"items": items}


@router.get("/conversations/{conversation_id}")
def admin_get_conversation(
    conversation_id: int,
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    with get_session() as session:
        row = (
            session.query(
                Conversation,
                User.name.label("user_name"),
                User.email.label("user_email"),
            )
            .join(User, User.id == Conversation.user_id)
            .filter(Conversation.id == conversation_id)
            .first()
        )
    if not row:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv, user_name, user_email = row
    conv_dict = _to_dict(conv)
    conv_dict["user_name"] = user_name
    conv_dict["user_email"] = user_email
    conv_dict["messages"] = list_messages(conversation_id=conversation_id)
    return {"item": conv_dict}
