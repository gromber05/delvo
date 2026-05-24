from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor


def list_events(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, gcal_event_id, created_at, updated_at
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
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, gcal_event_id, created_at, updated_at
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
    gcal_event_id: str | None = None,
) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO events (user_id, title, description, event_date, event_time, location, event_type, gcal_event_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, title, description, event_date, event_time, location, event_type, gcal_event_id),
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


def list_synced_events(*, user_id: int) -> list[dict[str, Any]]:
    """Returns all local events that have a gcal_event_id (synced from or pushed to GCal)."""
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, gcal_event_id
            FROM events
            WHERE user_id = %s AND gcal_event_id IS NOT NULL
            """,
            (user_id,),
        )
        rows = cursor.fetchall() or []
        return [dict(row) for row in rows]


def find_unlinked_event(*, user_id: int, title: str, event_date: str) -> dict[str, Any] | None:
    """Finds a local event with the same title+date that is NOT yet linked to a
    Google Calendar event. Used to link (instead of duplicating) when a locally
    created event reaches GCal before its gcal_event_id was persisted."""
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, event_date, event_time, location, event_type, gcal_event_id
            FROM events
            WHERE user_id = %s AND title = %s AND event_date = %s AND gcal_event_id IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id, title, event_date),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def update_event_from_gcal(
    *,
    event_id: int,
    user_id: int,
    title: str,
    event_date: str,
    event_time: str | None,
    description: str | None,
    location: str | None,
) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE events
            SET title = %s,
                description = %s,
                event_date = %s,
                event_time = %s,
                location = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            """,
            (title, description, event_date, event_time, location, event_id, user_id),
        )
        connection.commit()


def set_gcal_event_id(*, event_id: int, user_id: int, gcal_event_id: str) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE events SET gcal_event_id = %s WHERE id = %s AND user_id = %s",
            (gcal_event_id, event_id, user_id),
        )
        connection.commit()


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
