from __future__ import annotations
import datetime as dt
from typing import Any
from sqlalchemy import asc, nulls_last
from app.db.models import Task, _to_dict, get_session

def _parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    return dt.date.fromisoformat(value)

def _parse_time(value: str | None) -> dt.time | None:
    if not value:
        return None
    return dt.time.fromisoformat(value)

def list_tasks(*, user_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(Task)
            .filter(Task.user_id == user_id)
            .order_by(
                nulls_last(asc(Task.due_date)),
                nulls_last(asc(Task.due_time)),
                Task.created_at.desc(),
            )
            .all()
        )
        return [_to_dict(row) for row in rows]

def get_task(*, task_id: int, user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(Task)
            .filter(Task.id == task_id, Task.user_id == user_id)
            .first()
        )
        return _to_dict(row) if row else None

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
    with get_session() as session:
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            due_date=_parse_date(due_date),
            due_time=_parse_time(due_time),
            priority=priority,
            status=status,
        )
        session.add(task)
        session.flush()
        result = _to_dict(task)
    return result

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
    with get_session() as session:
        task = (
            session.query(Task)
            .filter(Task.id == task_id, Task.user_id == user_id)
            .first()
        )
        if not task:
            return None
        task.title = title
        task.description = description
        task.due_date = _parse_date(due_date)
        task.due_time = _parse_time(due_time)
        task.priority = priority
        task.status = status
        session.flush()
        result = _to_dict(task)
    return result

def delete_task(*, task_id: int, user_id: int) -> bool:
    with get_session() as session:
        task = (
            session.query(Task)
            .filter(Task.id == task_id, Task.user_id == user_id)
            .first()
        )
        if not task:
            return False
        session.delete(task)
    return True
