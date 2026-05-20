from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor


def list_notes(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, content, status, created_at, updated_at
            FROM notes
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall() or []
        return [dict(row) for row in rows]


def get_note(*, note_id: int, user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, content, status, created_at, updated_at
            FROM notes
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (note_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_note(
    *,
    user_id: int,
    title: str,
    content: str | None,
    status: str,
) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO notes (user_id, title, content, status)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, title, content, status),
        )
        inserted = cursor.fetchone()
        note_id = int(inserted[0])
        connection.commit()

    note = get_note(note_id=note_id, user_id=user_id)
    return note or {"id": note_id}


def update_note(
    *,
    note_id: int,
    user_id: int,
    title: str,
    content: str | None,
    status: str,
) -> dict[str, Any] | None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE notes
            SET title = %s,
                content = %s,
                status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            """,
            (title, content, status, note_id, user_id),
        )
        affected = cursor.rowcount
        connection.commit()

    if affected == 0:
        return None
    return get_note(note_id=note_id, user_id=user_id)


def delete_note(*, note_id: int, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            DELETE FROM notes
            WHERE id = %s AND user_id = %s
            """,
            (note_id, user_id),
        )
        deleted = cursor.rowcount > 0
        connection.commit()
    return deleted


# Backward-compatible aliases while codebase finishes migration.
get_notes = get_note
create_notes = create_note
update_notes = update_note
