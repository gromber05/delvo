from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import asc, nulls_last

from app.db.models import Event, _to_dict, get_session


def _parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    return dt.date.fromisoformat(value)


def _parse_time(value: str | None) -> dt.time | None:
    if not value:
        return None
    return dt.time.fromisoformat(value)


def list_events(*, user_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(Event)
            .filter(Event.user_id == user_id)
            .order_by(
                asc(Event.event_date),
                nulls_last(asc(Event.event_time)),
                Event.created_at.desc(),
            )
            .all()
        )
        return [_to_dict(row) for row in rows]


def get_event(*, event_id: int, user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(Event)
            .filter(Event.id == event_id, Event.user_id == user_id)
            .first()
        )
        return _to_dict(row) if row else None


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
    with get_session() as session:
        event = Event(
            user_id=user_id,
            title=title,
            description=description,
            event_date=_parse_date(event_date),
            event_time=_parse_time(event_time),
            location=location,
            event_type=event_type,
            gcal_event_id=gcal_event_id,
        )
        session.add(event)
        session.flush()
        result = _to_dict(event)
    return result


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
    with get_session() as session:
        event = (
            session.query(Event)
            .filter(Event.id == event_id, Event.user_id == user_id)
            .first()
        )
        if not event:
            return None
        event.title = title
        event.description = description
        event.event_date = _parse_date(event_date)
        event.event_time = _parse_time(event_time)
        event.location = location
        event.event_type = event_type
        session.flush()
        result = _to_dict(event)
    return result


def list_synced_events(*, user_id: int) -> list[dict[str, Any]]:
    """Returns all local events that have a gcal_event_id (synced from or pushed to GCal)."""
    with get_session() as session:
        rows = (
            session.query(Event)
            .filter(Event.user_id == user_id, Event.gcal_event_id.isnot(None))
            .all()
        )
        return [_to_dict(row) for row in rows]


def find_unlinked_event(*, user_id: int, title: str, event_date: str) -> dict[str, Any] | None:
    """Finds a local event with the same title+date that is NOT yet linked to a
    Google Calendar event. Used to link (instead of duplicating) when a locally
    created event reaches GCal before its gcal_event_id was persisted."""
    parsed_date = _parse_date(event_date)
    with get_session() as session:
        row = (
            session.query(Event)
            .filter(
                Event.user_id == user_id,
                Event.title == title,
                Event.event_date == parsed_date,
                Event.gcal_event_id.is_(None),
            )
            .order_by(Event.created_at.desc())
            .first()
        )
        return _to_dict(row) if row else None


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
    with get_session() as session:
        event = (
            session.query(Event)
            .filter(Event.id == event_id, Event.user_id == user_id)
            .first()
        )
        if event:
            event.title = title
            event.description = description
            event.event_date = _parse_date(event_date)
            event.event_time = _parse_time(event_time)
            event.location = location


def set_gcal_event_id(*, event_id: int, user_id: int, gcal_event_id: str) -> None:
    with get_session() as session:
        event = (
            session.query(Event)
            .filter(Event.id == event_id, Event.user_id == user_id)
            .first()
        )
        if event:
            event.gcal_event_id = gcal_event_id


def delete_event(*, event_id: int, user_id: int) -> bool:
    with get_session() as session:
        event = (
            session.query(Event)
            .filter(Event.id == event_id, Event.user_id == user_id)
            .first()
        )
        if not event:
            return False
        session.delete(event)
    return True
