from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.v1.dependencies import require_admin
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
    """All conversations across all users (admin view)."""
    from app.db.postgresql.connector import get_db_cursor
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   u.name AS user_name, u.email AS user_email,
                   COUNT(m.id) AS message_count
            FROM conversations c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN messages m ON m.conversation_id = c.id
            GROUP BY c.id, u.name, u.email
            ORDER BY c.updated_at DESC
            LIMIT 200
            """
        )
        items = [dict(r) for r in cursor.fetchall()]
    return {"items": items}


@router.get("/conversations/{conversation_id}")
def admin_get_conversation(
    conversation_id: int,
    _admin: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Full conversation with messages (admin view, no user restriction)."""
    from app.db.postgresql.connector import get_db_cursor
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   u.name AS user_name, u.email AS user_email
            FROM conversations c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = %s
            """,
            (conversation_id,),
        )
        row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv = dict(row)
    conv["messages"] = list_messages(conversation_id=conversation_id)
    return {"item": conv}
