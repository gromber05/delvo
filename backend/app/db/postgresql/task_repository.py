from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor


def list_tasks(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, due_date, due_time, priority, status, created_at, updated_at
            FROM tasks
            WHERE user_id = %s
            ORDER BY due_date IS NULL, due_date, due_time IS NULL, due_time, created_at DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall() or []
        return [dict(row) for row in rows]


def get_task(*, task_id: int, user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, due_date, due_time, priority, status, created_at, updated_at
            FROM tasks
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (task_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_task(
    *,
    user_id: int,
    title: str,
    description: str | None,
    due_date: str | None,
    due_time: str | None,
    priority: str,
    status: str,
) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO tasks (user_id, title, description, due_date, due_time, priority, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, title, description, due_date, due_time, priority, status),
        )
        inserted = cursor.fetchone()
        task_id = int(inserted[0])
        connection.commit()

    task = get_task(task_id=task_id, user_id=user_id)
    return task or {"id": task_id}


def update_task(
    *,
    task_id: int,
    user_id: int,
    title: str,
    description: str | None,
    due_date: str | None,
    due_time: str | None,
    priority: str,
    status: str,
) -> dict[str, Any] | None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE tasks
            SET title = %s,
                description = %s,
                due_date = %s,
                due_time = %s,
                priority = %s,
                status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            """,
            (title, description, due_date, due_time, priority, status, task_id, user_id),
        )
        affected = cursor.rowcount
        connection.commit()

    if affected == 0:
        return None
    return get_task(task_id=task_id, user_id=user_id)


def delete_task(*, task_id: int, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            DELETE FROM tasks
            WHERE id = %s AND user_id = %s
            """,
            (task_id, user_id),
        )
        deleted = cursor.rowcount > 0
        connection.commit()
    return deleted
