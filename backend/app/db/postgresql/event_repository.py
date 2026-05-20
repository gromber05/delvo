from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor


def list_events(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, created_at, updated_at
            FROM events
            WHERE user_id = %s
            ORDER BY event_date, event_time IS NULL, event_time, created_at DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall() or []
        return [dict(row) for row in rows]


def get_event(*, event_id: int, user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, created_at, updated_at
            FROM events
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (event_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_event(
    *,
    user_id: int,
    title: str,
    description: str | None,
    event_date: str,
    event_time: str | None,
    location: str | None,
    event_type: str,
) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO events (user_id, title, description, event_date, event_time, location, event_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, title, description, event_date, event_time, location, event_type),
        )
        inserted = cursor.fetchone()
        event_id = int(inserted[0])
        connection.commit()

    event = get_event(event_id=event_id, user_id=user_id)
    return event or {"id": event_id}


def update_event(
    *,
    event_id: int,
    user_id: int,
    title: str,
    description: str | None,
    event_date: str,
    event_time: str | None,
    location: str | None,
    event_type: str,
) -> dict[str, Any] | None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE events
            SET title = %s,
                description = %s,
                event_date = %s,
                event_time = %s,
                location = %s,
                event_type = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            """,
            (title, description, event_date, event_time, location, event_type, event_id, user_id),
        )
        affected = cursor.rowcount
        connection.commit()

    if affected == 0:
        return None
    return get_event(event_id=event_id, user_id=user_id)


def delete_event(*, event_id: int, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            DELETE FROM events
            WHERE id = %s AND user_id = %s
            """,
            (event_id, user_id),
        )
        deleted = cursor.rowcount > 0
        connection.commit()
    return deleted
