from __future__ import annotations
import datetime as dt
import re
from typing import Any
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app.db.models import Meeting, MeetingParticipant, _to_dict, get_session

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

def _parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    return dt.date.fromisoformat(value)

def _parse_time(value: str | None) -> dt.time | None:
    if not value:
        return None
    return dt.time.fromisoformat(value)

def _participants_to_strings(participants: list[MeetingParticipant]) -> list[str]:
    result = []
    for p in participants:
        label = (p.participant_name or "").strip() or (p.participant_email or "").strip()
        if label:
            result.append(label)
    return result

def _meeting_to_dict(meeting: Meeting) -> dict[str, Any]:
    d = _to_dict(meeting)
    d["participants"] = _participants_to_strings(meeting.participants)
    return d

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

    parsed_date = _parse_date(meeting_date)
    parsed_time = _parse_time(meeting_time)

    with get_session() as session:
        row = (
            session.query(Meeting)
            .filter(
                Meeting.user_id == user_id,
                Meeting.meeting_date == parsed_date,
                Meeting.meeting_time == parsed_time,
                func.lower(func.trim(Meeting.title)) == normalized_title.lower(),
            )
            .order_by(Meeting.created_at.desc(), Meeting.id.desc())
            .first()
        )
    if not row:
        return None
    return row.id

def _replace_participants(*, meeting_id: int, participants: list[str] | None) -> None:
    normalized = _normalize_participants(participants)

    with get_session() as session:
        session.query(MeetingParticipant).filter(
            MeetingParticipant.meeting_id == meeting_id
        ).delete(synchronize_session="fetch")

        for name, email in normalized:
            session.add(MeetingParticipant(
                meeting_id=meeting_id,
                participant_name=name,
                participant_email=email,
            ))

def list_meetings(*, user_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(Meeting)
            .options(joinedload(Meeting.participants))
            .filter(Meeting.user_id == user_id)
            .order_by(
                Meeting.meeting_date.asc(),
                Meeting.meeting_time.asc(),
                Meeting.created_at.desc(),
            )
            .all()
        )
        return [_meeting_to_dict(row) for row in rows]

def get_meeting(*, meeting_id: int, user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(Meeting)
            .options(joinedload(Meeting.participants))
            .filter(Meeting.id == meeting_id, Meeting.user_id == user_id)
            .first()
        )
        return _meeting_to_dict(row) if row else None

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

    with get_session() as session:
        meeting = Meeting(
            user_id=user_id,
            title=title,
            description=description,
            meeting_date=_parse_date(meeting_date),
            meeting_time=_parse_time(meeting_time),
            duration_minutes=duration_minutes,
            location=location,
            status=status,
        )
        session.add(meeting)
        session.flush()
        meeting_id = meeting.id

    _replace_participants(meeting_id=meeting_id, participants=participants)

    result = get_meeting(meeting_id=meeting_id, user_id=user_id)
    return result or {"id": meeting_id}

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

    with get_session() as session:
        meeting = (
            session.query(Meeting)
            .filter(Meeting.id == meeting_id, Meeting.user_id == user_id)
            .first()
        )
        if not meeting:
            return None
        meeting.title = title
        meeting.description = description
        meeting.meeting_date = _parse_date(meeting_date)
        meeting.meeting_time = _parse_time(meeting_time)
        meeting.duration_minutes = duration_minutes
        meeting.location = location
        meeting.status = status

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
    with get_session() as session:
        meeting = (
            session.query(Meeting)
            .filter(Meeting.id == meeting_id, Meeting.user_id == user_id)
            .first()
        )
        if not meeting:
            return False
        session.delete(meeting)
    return True
