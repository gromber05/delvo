from __future__ import annotations

import re
from typing import Any

from app.db.postgresql.connector import get_db_cursor


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _split_name_email(raw: str) -> tuple[str | None, str | None]:
    value = raw.strip()
    if not value:
        return None, None

    lt_index = value.find("<")
    gt_index = value.find(">")
    if lt_index > 0 and gt_index > lt_index:
        name = value[:lt_index].strip() or None
        email_candidate = value[lt_index + 1 : gt_index].strip().lower()
        if EMAIL_PATTERN.match(email_candidate):
            return name, email_candidate

    if EMAIL_PATTERN.match(value.lower()):
        email_value = value.lower()
        local_part = email_value.split("@", 1)[0].replace(".", " ").replace("_", " ").strip()
        return (local_part.title() if local_part else None), email_value

    return value, None


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    slug = "".join(char if char.isalnum() else "." for char in lowered)
    slug = ".".join(part for part in slug.split(".") if part)
    return slug or "participant"


def _normalize_participants(participants: list[str] | None) -> list[tuple[str | None, str]]:
    if not participants:
        return []

    normalized: list[tuple[str | None, str]] = []
    used_emails: set[str] = set()

    for raw_participant in participants:
        if not isinstance(raw_participant, str):
            continue
        name, email = _split_name_email(raw_participant)
        if not name and not email:
            continue

        if not email:
            base_slug = _slugify(name or "participant")
            generated = f"{base_slug}@participant.local"
            if generated in used_emails:
                suffix = 2
                while f"{base_slug}.{suffix}@participant.local" in used_emails:
                    suffix += 1
                generated = f"{base_slug}.{suffix}@participant.local"
            email = generated

        email = email.lower()
        if email in used_emails:
            continue

        used_emails.add(email)
        normalized.append((name, email))

    return normalized


def _normalize_participants_value(value: Any) -> list[str]:
    if isinstance(value, str):
        normalized = value.strip()
        return [normalized] if normalized else []

    if not isinstance(value, list):
        return []

    seen: set[str] = set()
    output: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if not normalized:
            continue
        lowered = normalized.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        output.append(normalized)
    return output


def _merge_participants(existing: list[str], incoming: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []

    for value in [*existing, *incoming]:
        normalized = value.strip()
        if not normalized:
            continue
        lowered = normalized.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        output.append(normalized)
    return output


def _list_participants_by_meeting_ids(*, meeting_ids: list[int]) -> dict[int, list[str]]:
    if not meeting_ids:
        return {}

    placeholders = ", ".join(["%s"] * len(meeting_ids))
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            f"""
            SELECT meeting_id, participant_name, participant_email, created_at
            FROM meeting_participants
            WHERE meeting_id IN ({placeholders})
            ORDER BY meeting_id ASC, created_at ASC, id ASC
            """,
            tuple(meeting_ids),
        )
        rows = cursor.fetchall() or []

    output: dict[int, list[str]] = {meeting_id: [] for meeting_id in meeting_ids}
    for row in rows:
        meeting_id = int(row.get("meeting_id"))
        participant_name = str(row.get("participant_name") or "").strip()
        participant_email = str(row.get("participant_email") or "").strip()
        label = participant_name or participant_email
        if not label:
            continue
        output.setdefault(meeting_id, []).append(label)
    return output


def _find_exact_meeting_id(
    *,
    user_id: int,
    title: str,
    meeting_date: str,
    meeting_time: str,
) -> int | None:
    normalized_title = title.strip()
    if not normalized_title:
        return None

    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id
            FROM meetings
            WHERE user_id = %s
              AND meeting_date = %s
              AND meeting_time = %s
              AND LOWER(TRIM(title)) = LOWER(TRIM(%s))
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (user_id, meeting_date, meeting_time, normalized_title),
        )
        row = cursor.fetchone()

    if not row:
        return None
    try:
        return int(row.get("id"))
    except (TypeError, ValueError):
        return None


def _replace_participants(*, meeting_id: int, participants: list[str] | None) -> None:
    normalized = _normalize_participants(participants)

    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            DELETE FROM meeting_participants
            WHERE meeting_id = %s
            """,
            (meeting_id,),
        )

        for name, email in normalized:
            cursor.execute(
                """
                INSERT INTO meeting_participants (meeting_id, participant_name, participant_email)
                VALUES (%s, %s, %s)
                """,
                (meeting_id, name, email),
            )

        connection.commit()


def list_meetings(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, meeting_date, meeting_time, duration_minutes, location, status, created_at, updated_at
            FROM meetings
            WHERE user_id = %s
            ORDER BY meeting_date, meeting_time, created_at DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall() or []
        items = [dict(row) for row in rows]

    meeting_ids: list[int] = []
    for item in items:
        try:
            meeting_id = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        meeting_ids.append(meeting_id)

    participants_by_meeting = _list_participants_by_meeting_ids(meeting_ids=meeting_ids)
    for item in items:
        try:
            meeting_id = int(item.get("id"))
        except (TypeError, ValueError):
            item["participants"] = []
            continue
        item["participants"] = participants_by_meeting.get(meeting_id, [])
    return items


def get_meeting(*, meeting_id: int, user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, user_id, title, description, meeting_date, meeting_time, duration_minutes, location, status, created_at, updated_at
            FROM meetings
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (meeting_id, user_id),
        )
        row = cursor.fetchone()
        item = dict(row) if row else None

    if not item:
        return None

    participants_by_meeting = _list_participants_by_meeting_ids(meeting_ids=[meeting_id])
    item["participants"] = participants_by_meeting.get(meeting_id, [])
    return item


def create_meeting(
    *,
    user_id: int,
    title: str,
    description: str | None,
    meeting_date: str,
    meeting_time: str,
    duration_minutes: int | None,
    location: str | None,
    status: str,
    participants: list[str] | None = None,
) -> dict[str, Any]:
    existing_meeting_id = _find_exact_meeting_id(
        user_id=user_id,
        title=title,
        meeting_date=meeting_date,
        meeting_time=meeting_time,
    )
    if existing_meeting_id is not None:
        existing = get_meeting(meeting_id=existing_meeting_id, user_id=user_id)
        if existing:
            merged_participants = _merge_participants(
                _normalize_participants_value(existing.get("participants")),
                participants or [],
            )
            updated = update_meeting(
                meeting_id=existing_meeting_id,
                user_id=user_id,
                title=title,
                description=description if description is not None else existing.get("description"),
                meeting_date=meeting_date,
                meeting_time=meeting_time,
                duration_minutes=(
                    duration_minutes
                    if duration_minutes is not None
                    else int(existing["duration_minutes"])
                    if existing.get("duration_minutes") is not None
                    else None
                ),
                location=location if location is not None else existing.get("location"),
                status=status if status else str(existing.get("status") or "scheduled"),
                participants=merged_participants,
            )
            if updated:
                return updated

    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO meetings (user_id, title, description, meeting_date, meeting_time, duration_minutes, location, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, title, description, meeting_date, meeting_time, duration_minutes, location, status),
        )
        inserted = cursor.fetchone()
        meeting_id = int(inserted[0])
        connection.commit()

    _replace_participants(meeting_id=meeting_id, participants=participants)

    meeting = get_meeting(meeting_id=meeting_id, user_id=user_id)
    return meeting or {"id": meeting_id}


def update_meeting(
    *,
    meeting_id: int,
    user_id: int,
    title: str,
    description: str | None,
    meeting_date: str,
    meeting_time: str,
    duration_minutes: int | None,
    location: str | None,
    status: str,
    participants: list[str] | None = None,
) -> dict[str, Any] | None:
    existing = get_meeting(meeting_id=meeting_id, user_id=user_id)
    if not existing:
        return None

    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            UPDATE meetings
            SET title = %s,
                description = %s,
                meeting_date = %s,
                meeting_time = %s,
                duration_minutes = %s,
                location = %s,
                status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            """,
            (title, description, meeting_date, meeting_time, duration_minutes, location, status, meeting_id, user_id),
        )
        connection.commit()

    if participants is not None:
        _replace_participants(meeting_id=meeting_id, participants=participants)

    return get_meeting(meeting_id=meeting_id, user_id=user_id)


def update_meeting_participants(
    *,
    meeting_id: int,
    user_id: int,
    participants: list[str] | None,
) -> dict[str, Any] | None:
    existing = get_meeting(meeting_id=meeting_id, user_id=user_id)
    if not existing:
        return None

    _replace_participants(meeting_id=meeting_id, participants=participants)
    return get_meeting(meeting_id=meeting_id, user_id=user_id)


def delete_meeting(*, meeting_id: int, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            DELETE FROM meetings
            WHERE id = %s AND user_id = %s
            """,
            (meeting_id, user_id),
        )
        deleted = cursor.rowcount > 0
        connection.commit()
    return deleted
