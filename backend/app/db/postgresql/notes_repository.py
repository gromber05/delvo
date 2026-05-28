from __future__ import annotations

from typing import Any

from app.db.models import Note, _to_dict, get_session

def list_notes(*, user_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(Note)
            .filter(Note.user_id == user_id)
            .order_by(Note.created_at.desc())
            .all()
        )
        return [_to_dict(row) for row in rows]


def get_note(*, note_id: int, user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(Note)
            .filter(Note.id == note_id, Note.user_id == user_id)
            .first()
        )
        return _to_dict(row) if row else None

def create_note(
    *,
    user_id: int,
    title: str,
    content: str | None,
    status: str,
) -> dict[str, Any]:
    with get_session() as session:
        note = Note(
            user_id=user_id,
            title=title,
            content=content,
            status=status,
        )
        session.add(note)
        session.flush()
        result = _to_dict(note)
    return result

def update_note(
    *,
    note_id: int,
    user_id: int,
    title: str,
    content: str | None,
    status: str,
) -> dict[str, Any] | None:
    with get_session() as session:
        note = (
            session.query(Note)
            .filter(Note.id == note_id, Note.user_id == user_id)
            .first()
        )
        if not note:
            return None
        note.title = title
        note.content = content
        note.status = status
        session.flush()
        result = _to_dict(note)
    return result

def delete_note(*, note_id: int, user_id: int) -> bool:
    with get_session() as session:
        note = (
            session.query(Note)
            .filter(Note.id == note_id, Note.user_id == user_id)
            .first()
        )
        if not note:
            return False
        session.delete(note)
    return True

get_notes = get_note
create_notes = create_note
update_notes = update_note
