from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from app.db.postgresql.event_repository import create_event
from app.db.postgresql.meeting_repository import (
    create_meeting,
    delete_meeting,
    get_meeting,
    list_meetings,
    update_meeting,
    update_meeting_participants,
)
from app.db.postgresql.task_repository import create_task, get_task, list_tasks, update_task
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service
from .schemas import ChatRequest, ChatResponse


VALID_TASK_PRIORITIES = {"low", "medium", "high"}
VALID_TASK_STATUSES = {"pending", "in_progress", "done"}
VALID_MEETING_STATUSES = {"scheduled", "completed", "cancelled"}
AFFIRMATIVE_WORDS = {"yes", "y", "si", "sí", "vale", "ok", "okay", "confirm", "confirmed"}
CLOSURE_WORDS = {
    "nada mas",
    "nada más",
    "eso es todo",
    "ya estaria",
    "ya estaría",
    "no",
    "no gracias",
    "gracias",
    "that's all",
    "thats all",
    "nothing else",
    "no more",
    "no thanks",
}
PARTICIPANTS_SEPARATOR_PATTERN = re.compile(r"\s*(?:,|;|\by\b|\band\b|/|\|)\s*", flags=re.IGNORECASE)
DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
TIME_PATTERN = re.compile(r"\b\d{2}:\d{2}(?::\d{2})?\b")


def build_tasks_context(user_id: int | None) -> str:
    if user_id is None:
        return "Contexto de tareas del usuario: no autenticado."

    tasks = list_tasks(user_id=user_id)
    if not tasks:
        return "Contexto de tareas del usuario: no hay tareas registradas."

    rows: List[str] = []
    for task in tasks[:30]:
        rows.append(
            "- "
            f"id={task.get('id')}; "
            f"titulo={task.get('title')}; "
            f"fecha={task.get('due_date') or 'sin fecha'}; "
            f"hora={task.get('due_time') or 'sin hora'}; "
            f"prioridad={task.get('priority') or 'sin prioridad'}; "
            f"estado={task.get('status') or 'pending'}"
        )

    return "Contexto de tareas del usuario:\n" + "\n".join(rows)


def build_meetings_context(user_id: int | None) -> str:
    if user_id is None:
        return "Contexto de reuniones del usuario: no autenticado."

    meetings = list_meetings(user_id=user_id)
    if not meetings:
        return "Contexto de reuniones del usuario: no hay reuniones registradas."

    rows: List[str] = []
    for meeting in meetings[:30]:
        participants = _normalize_participants_value(meeting.get("participants"))
        participants_text = ", ".join(participants) if participants else "sin participantes"
        rows.append(
            "- "
            f"id={meeting.get('id')}; "
            f"titulo={meeting.get('title')}; "
            f"fecha={_as_date_string(meeting.get('meeting_date')) or 'sin fecha'}; "
            f"hora={_as_time_string(meeting.get('meeting_time')) or 'sin hora'}; "
            f"duracion={meeting.get('duration_minutes') or 'sin duracion'}; "
            f"ubicacion={meeting.get('location') or 'sin ubicacion'}; "
            f"estado={meeting.get('status') or 'scheduled'}; "
            f"participantes={participants_text}"
        )

    return "Contexto de reuniones del usuario:\n" + "\n".join(rows)


def _coerce_non_empty_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized if normalized else None


def _normalize_text_key(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    lowered = without_marks.casefold()
    simplified = re.sub(r"[^a-z0-9]+", " ", lowered).strip()
    return re.sub(r"\s+", " ", simplified)


def _titles_match(left: str | None, right: str | None) -> bool:
    left_text = _coerce_non_empty_text(left)
    right_text = _coerce_non_empty_text(right)
    if not left_text or not right_text:
        return False
    return _normalize_text_key(left_text) == _normalize_text_key(right_text)


def _normalize_date(value: Any) -> str | None:
    raw = _coerce_non_empty_text(value)
    if not raw:
        return None

    try:
        return datetime.strptime(raw, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        return None


def _normalize_time(value: Any) -> str | None:
    raw = _coerce_non_empty_text(value)
    if not raw:
        return None

    # Accept hour-only inputs like "20" and normalize to "20:00".
    for fmt in ("%H:%M", "%H:%M:%S", "%H"):
        try:
            return datetime.strptime(raw, fmt).strftime("%H:%M")
        except ValueError:
            continue
    return None


def _normalize_choice(value: Any, valid_options: set[str], fallback: str) -> str:
    raw = _coerce_non_empty_text(value)
    if not raw:
        return fallback
    normalized = raw.lower()
    return normalized if normalized in valid_options else fallback


def _resolve_request_language(value: str | None) -> str:
    raw = _coerce_non_empty_text(value)
    if not raw:
        return "es"
    base = raw.lower().split("-")[0]
    return "en" if base == "en" else "es"


def _build_serialized_tasks(user_id: int) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for task in list_tasks(user_id=user_id):
        serialized.append(
            {
                "id": task.get("id"),
                "title": task.get("title"),
                "date": task.get("due_date") or "sin fecha",
                "time": task.get("due_time") or "sin hora",
                "priority": task.get("priority") or "medium",
                "status": task.get("status") or "pending",
            }
        )
    return serialized


def _build_serialized_meetings(user_id: int) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for meeting in list_meetings(user_id=user_id):
        serialized.append(
            {
                "id": meeting.get("id"),
                "title": meeting.get("title"),
                "date": _as_date_string(meeting.get("meeting_date")) or "sin fecha",
                "time": _as_time_string(meeting.get("meeting_time")) or "sin hora",
                "duration_minutes": _normalize_int(meeting.get("duration_minutes")),
                "location": meeting.get("location") or "sin ubicacion",
                "status": meeting.get("status") or "scheduled",
                "participants": _normalize_participants_value(meeting.get("participants")),
            }
        )
    return serialized


def _normalize_participants_value(value: Any) -> List[str]:
    if isinstance(value, str):
        normalized = value.strip()
        return [normalized] if normalized else []

    if not isinstance(value, list):
        return []

    seen: set[str] = set()
    output: List[str] = []
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


def _merge_participants(existing: List[str], incoming: List[str]) -> List[str]:
    seen: set[str] = set()
    output: List[str] = []

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


def _looks_like_meeting_list_request(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return False
    patterns = [
        "que reuniones",
        "qué reuniones",
        "mis reuniones",
        "reuniones tengo",
        "que meetings tengo",
        "qué meetings tengo",
        "quiero ver meetings",
        "meetings tengo",
        "what meetings",
        "my meetings",
        "meetings do i have",
        "meetings did i have",
    ]
    return any(pattern in normalized for pattern in patterns)


def _looks_like_delete_all_meetings_request(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return False
    if "reunion de prueba" in normalized or "reunión de prueba" in normalized:
        if any(token in normalized for token in ["borra", "borrar", "borrrar", "elimina", "eliminar", "delete", "remove", "erase"]):
            return False
    patterns = [
        "remove all meetings",
        "delete all meetings",
        "erase all meetings",
        "remove all",
        "delete all",
        "erase all",
        "elimina todas las reuniones",
        "borra todas las reuniones",
        "borrrar todas las reuniones",
        "elimina todo",
        "borra todo",
    ]
    return any(pattern in normalized for pattern in patterns)


def _looks_like_affirmative(text: str) -> bool:
    normalized = text.strip().lower()
    return normalized in AFFIRMATIVE_WORDS


def _assistant_requested_delete_confirmation(history: List[Dict[str, str]]) -> bool:
    for turn in reversed(history):
        role = str(turn.get("role", "")).strip().lower()
        if role != "assistant":
            continue
        content = str(turn.get("content", "")).strip().lower()
        if not content:
            continue
        if (
            "delete all" in content
            or "remove all" in content
            or "eliminar todas" in content
            or "borrar todas" in content
            or "remove all four" in content
        ):
            return True
        return False
    return False


def _assistant_asked_for_more_changes(history: List[Dict[str, str]]) -> bool:
    for turn in reversed(history):
        role = str(turn.get("role", "")).strip().lower()
        if role != "assistant":
            continue
        content = str(turn.get("content", "")).strip().lower()
        if not content:
            continue
        if (
            "anything else" in content
            or "like to adjust" in content
            or "any other" in content
            or "algo mas" in content
            or "algo más" in content
            or "quieres ajustar" in content
            or "quieres cambiar" in content
            or "necesitas algo más" in content
        ):
            return True
        return False
    return False


def _assistant_asked_for_participants(history: List[Dict[str, str]]) -> bool:
    for turn in reversed(history):
        role = str(turn.get("role", "")).strip().lower()
        if role != "assistant":
            continue

        content = str(turn.get("content", "")).strip().lower()
        if not content:
            continue

        asks_names = any(
            token in content
            for token in [
                "nombres de las personas",
                "nombres de los asistentes",
                "indicas los nombres",
                "a quién quieres añadir",
                "a quien quieres añadir",
                "quién quieres añadir",
                "quien quieres añadir",
                "who do you want to add",
                "who should i add",
                "what are the names",
                "names of attendees",
                "names of participants",
            ]
        )
        mentions_participants = any(
            token in content for token in ["participantes", "asistentes", "participants", "attendees"]
        )
        if asks_names and mentions_participants:
            return True
        return False
    return False


def _get_last_assistant_message(history: List[Dict[str, str]]) -> str:
    for turn in reversed(history):
        role = str(turn.get("role", "")).strip().lower()
        if role != "assistant":
            continue
        content = str(turn.get("content", "")).strip()
        if content:
            return content
    return ""


def _assistant_requested_meeting_disambiguation(history: List[Dict[str, str]]) -> bool:
    content = _get_last_assistant_message(history).strip().lower()
    if not content:
        return False

    asks_confirmation = any(
        token in content
        for token in [
            "cuál es la correcta",
            "cual es la correcta",
            "confirmar si se refiere",
            "which one is correct",
            "confirm whether",
        ]
    )
    mentions_meeting = any(
        token in content for token in ["reunión", "reunion", "meeting"]
    )
    has_date = DATE_PATTERN.search(content) is not None
    return asks_confirmation and mentions_meeting and has_date


def _assistant_requested_meeting_identification(history: List[Dict[str, str]]) -> bool:
    content = _get_last_assistant_message(history).strip().lower()
    if not content:
        return False
    return any(
        token in content
        for token in [
            "id de la reunión",
            "id de la reunion",
            "detalles completos",
            "identificarla correctamente",
            "confirmar la hora y la ubicación",
            "confirmar la hora y la ubicacion",
            "meeting id",
            "full details",
            "identify it correctly",
            "confirm the time and location",
        ]
    )


def _looks_like_only_meeting_reference(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return False
    patterns = [
        "la unica reunion",
        "la única reunión",
        "mi unica reunion",
        "mi única reunión",
        "the only meeting",
        "my only meeting",
        "only meeting i have",
    ]
    return any(pattern in normalized for pattern in patterns)


def _extract_participants_from_previous_user_turn(history: List[Dict[str, str]]) -> List[str]:
    # Only use the immediate previous user turn to avoid carrying stale names
    # from older conversations.
    for turn in reversed(history):
        role = str(turn.get("role", "")).strip().lower()
        if role != "user":
            continue
        content = str(turn.get("content", "")).strip()
        if not content:
            return []
        return _extract_participants_from_user_text(content)
    return []


def _extract_meeting_reference_from_text(text: str) -> Dict[str, str]:
    reference: Dict[str, str] = {}
    if not text:
        return reference

    quoted_title = re.search(r"'([^']+)'|\"([^\"]+)\"", text)
    if quoted_title:
        title = (quoted_title.group(1) or quoted_title.group(2) or "").strip()
        if title:
            reference["title"] = title

    date_match = DATE_PATTERN.search(text)
    if date_match:
        reference["date"] = date_match.group(0)

    time_match = TIME_PATTERN.search(text)
    if time_match:
        reference["time"] = _normalize_time(time_match.group(0)) or time_match.group(0)[:5]

    return reference


def _find_meeting_by_reference(
    *,
    meetings: List[Dict[str, Any]],
    reference: Dict[str, str],
) -> Dict[str, Any] | None:
    title = _coerce_non_empty_text(reference.get("title"))
    date = _normalize_date(reference.get("date"))
    time = _normalize_time(reference.get("time"))

    matches: List[Dict[str, Any]] = []
    for meeting in meetings:
        if title:
            meeting_title = _coerce_non_empty_text(meeting.get("title")) or ""
            if meeting_title.casefold() != title.casefold():
                continue
        if date:
            meeting_date = _as_date_string(meeting.get("meeting_date"))
            if meeting_date != date:
                continue
        if time:
            meeting_time = _as_time_string(meeting.get("meeting_time"))
            if meeting_time != time:
                continue
        matches.append(meeting)

    if len(matches) == 1:
        return matches[0]
    return None


def _select_meeting_by_title(
    *,
    meetings: List[Dict[str, Any]],
    title: str,
    prefer_date: str | None = None,
) -> Dict[str, Any] | None:
    title_norm = title.strip().casefold()
    if not title_norm:
        return None

    exact_matches: List[Dict[str, Any]] = []
    partial_matches: List[Dict[str, Any]] = []
    for meeting in meetings:
        meeting_title = _coerce_non_empty_text(meeting.get("title")) or ""
        meeting_title_norm = meeting_title.casefold()
        if meeting_title_norm == title_norm:
            exact_matches.append(meeting)
        elif title_norm in meeting_title_norm:
            partial_matches.append(meeting)

    candidates = exact_matches or partial_matches
    if not candidates:
        return None

    if prefer_date:
        same_day = [
            item for item in candidates if _as_date_string(item.get("meeting_date")) == prefer_date
        ]
        if len(same_day) == 1:
            return same_day[0]
        if same_day:
            return _select_latest_meeting_for_follow_up(same_day)

    if len(candidates) == 1:
        return candidates[0]
    return _select_latest_meeting_for_follow_up(candidates)


def _extract_participants_from_user_text(text: str) -> List[str]:
    normalized = text.strip()
    if not normalized:
        return []

    lowered = normalized.lower()
    detailed_match = re.search(
        r"(?:añad[ei]|agreg[au]|incluy[eo]|sum[ae]|add)\s+a?\s+(.+?)(?:\s+como\s+(?:participante|asistente|participant|attendee)\b|$)",
        lowered,
        flags=re.IGNORECASE,
    )
    if detailed_match:
        start_index = detailed_match.start(1)
        end_index = detailed_match.end(1)
        segment = normalized[start_index:end_index].strip(" .")
        if segment:
            return _normalize_participants_value(PARTICIPANTS_SEPARATOR_PATTERN.split(segment))

    candidates = PARTICIPANTS_SEPARATOR_PATTERN.split(normalized)
    participants: List[str] = []
    for candidate in candidates:
        value = candidate.strip(" .")
        if not value:
            continue
        if value.lower() in {"si", "sí", "ok", "vale", "please", "por favor"}:
            continue
        value = re.sub(
            r"^(?:añad[ei]|agreg[au]|incluy[eo]|sum[ae]|add)\s+a?\s+",
            "",
            value,
            flags=re.IGNORECASE,
        ).strip()
        value = re.sub(
            r"\s+como\s+(?:participante|asistente|participant|attendee)$",
            "",
            value,
            flags=re.IGNORECASE,
        ).strip()
        if len(value) > 120:
            continue
        participants.append(value)
    return _normalize_participants_value(participants)


def _select_latest_meeting_for_follow_up(meetings: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    best_match: Dict[str, Any] | None = None
    best_created_at: datetime | None = None
    best_id = -1

    for meeting in meetings:
        meeting_id = _normalize_int(meeting.get("id"))
        if meeting_id is None:
            continue

        created_at = _coerce_datetime(meeting.get("created_at"))
        if best_match is None:
            best_match = meeting
            best_created_at = created_at
            best_id = meeting_id
            continue

        if created_at is not None and (best_created_at is None or created_at > best_created_at):
            best_match = meeting
            best_created_at = created_at
            best_id = meeting_id
            continue

        if created_at is None and best_created_at is None and meeting_id > best_id:
            best_match = meeting
            best_id = meeting_id

    return best_match


def _build_participants_added_message(
    *,
    language: str,
    participants: List[str],
    meeting: Dict[str, Any],
) -> str:
    names = ", ".join(participants)
    meeting_date = _as_date_string(meeting.get("meeting_date")) or "sin fecha"
    meeting_time = _as_time_string(meeting.get("meeting_time")) or "sin hora"
    title = _coerce_non_empty_text(meeting.get("title")) or "la reunión"

    if language == "en":
        return (
            f"Perfect. I added {names} as attendees for '{title}' on {meeting_date} at {meeting_time}. "
            "Do you need anything else?"
        )

    return (
        f"Perfecto. He añadido a {names} como asistentes para '{title}' el {meeting_date} a las {meeting_time}. "
        "¿Necesitas algo más?"
    )


def _looks_like_conversation_closure(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return False
    return normalized in CLOSURE_WORDS


def _build_closure_message(language: str, *, user_text: str, history: List[Dict[str, str]]) -> str:
    seed = sum(ord(char) for char in user_text) + len(history) * 31

    if language == "en":
        openings = [
            "Perfect",
            "Great",
            "Awesome",
            "All set",
        ]
        gratitude = [
            "thanks for the confirmation",
            "thanks for letting me know",
            "appreciate it",
            "thanks for your time",
        ]
        endings = [
            "If you need anything else later, I'm here.",
            "Whenever you want, I can help you with the next one.",
            "I'll stay here in case you need another change.",
            "Feel free to ask me anything else whenever you want.",
        ]
        first = openings[seed % len(openings)]
        second = gratitude[(seed // 3) % len(gratitude)]
        third = endings[(seed // 7) % len(endings)]
        return f"{first}, {second}. {third}"

    openings = [
        "Perfecto",
        "Genial",
        "Estupendo",
        "Todo listo",
    ]
    gratitude = [
        "gracias por confirmarlo",
        "gracias por avisarme",
        "te lo agradezco",
        "gracias por tu tiempo",
    ]
    endings = [
        "Si más adelante necesitas algo, aquí estoy.",
        "Cuando quieras, te ayudo con lo siguiente.",
        "Me quedo por aquí por si quieres ajustar algo más.",
        "Si te surge cualquier cosa, me dices y lo vemos.",
    ]
    first = openings[seed % len(openings)]
    second = gratitude[(seed // 3) % len(gratitude)]
    third = endings[(seed // 7) % len(endings)]
    return f"{first}, {second}. {third}"


def _build_meetings_list_message(*, meetings: List[Dict[str, Any]], language: str) -> str:
    if language == "en":
        if not meetings:
            return "You currently do not have any meetings scheduled."
        lines = []
        for meeting in meetings[:10]:
            lines.append(
                f"- {meeting.get('title') or 'Untitled'} "
                f"on {meeting.get('date')} at {meeting.get('time')} "
                f"({meeting.get('location') or 'no location'})"
            )
        return "Here are your meetings:\n" + "\n".join(lines)

    if not meetings:
        return "Ahora mismo no tienes reuniones programadas."
    lines = []
    for meeting in meetings[:10]:
        lines.append(
            f"- {meeting.get('title') or 'Sin titulo'} "
            f"el {meeting.get('date')} a las {meeting.get('time')} "
            f"({meeting.get('location') or 'sin ubicacion'})"
        )
    return "Estas son tus reuniones:\n" + "\n".join(lines)


def _build_delete_all_meetings_message(*, deleted_count: int, language: str) -> str:
    if language == "en":
        if deleted_count == 0:
            return "There were no meetings to delete."
        return f"Done. I deleted {deleted_count} meetings."
    if deleted_count == 0:
        return "No habia reuniones para eliminar."
    return f"Listo. He eliminado {deleted_count} reuniones."


def _looks_like_test_meeting_request(text: str) -> bool:
    normalized = text.strip().lower()
    if not normalized:
        return False

    if any(
        token in normalized
        for token in [
            "borra",
            "borrar",
            "borrrar",
            "elimina",
            "eliminar",
            "quita",
            "remove",
            "delete",
            "erase",
            "list",
            "ver",
            "show",
            "añade",
            "añadir",
            "agrega",
            "agregar",
            "participant",
            "participante",
        ]
    ):
        return False

    # Require an explicit creation intent.
    asks_create = any(
        token in normalized
        for token in [
            "crear",
            "crea",
            "programa",
            "haz",
            "create",
            "schedule",
            "set up",
            "setup",
        ]
    )
    asks_test_meeting = any(
        token in normalized
        for token in [
            "reunion de prueba",
            "reunión de prueba",
            "test meeting",
            "demo meeting",
        ]
    )

    if not (asks_create and asks_test_meeting):
        return False

    # Extra guard against emails like test@test.es.
    return re.search(r"\b\S+@\S+\.\S+\b", normalized) is None


def _build_test_meeting_defaults(*, language: str) -> Dict[str, Any]:
    now = datetime.now(ZoneInfo("Europe/Madrid")) + timedelta(hours=1)
    meeting_date = now.strftime("%Y-%m-%d")
    meeting_time = now.replace(minute=0, second=0, microsecond=0).strftime("%H:%M")

    if language == "en":
        return {
            "title": "Test meeting",
            "description": "Auto-generated test meeting.",
            "meeting_date": meeting_date,
            "meeting_time": meeting_time,
            "location": "Main office",
            "duration_minutes": 30,
            "status": "scheduled",
            "message": (
                f"Done. I created a test meeting for {meeting_date} at {meeting_time} "
                "with 30 minutes duration."
            ),
        }

    return {
        "title": "Reunión de prueba",
        "description": "Reunión de prueba generada automáticamente.",
        "meeting_date": meeting_date,
        "meeting_time": meeting_time,
        "location": "Oficina principal",
        "duration_minutes": 30,
        "status": "scheduled",
        "message": (
            f"Listo. He creado una reunión de prueba para el {meeting_date} a las {meeting_time} "
            "con duración de 30 minutos."
        ),
    }


def _normalize_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            parsed = int(raw)
            return parsed if parsed > 0 else None
        except ValueError:
            return None
    return None


def _coerce_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None

    raw = value.strip()
    if not raw:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _as_date_string(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()[:10]
        except Exception:
            return None
    return _normalize_date(value)


def _as_time_string(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    if hasattr(value, "strftime"):
        try:
            return value.strftime("%H:%M")
        except Exception:
            return None
    return _normalize_time(value)


def _apply_intent_side_effects(
    result: Dict[str, Any],
    *,
    user_id: int | None,
) -> Dict[str, Any]:
    intent = str(result.get("intent", "query"))
    data = result.get("data", {})
    safe_data = data if isinstance(data, dict) else {}
    message = str(result.get("message", "")).strip()

    if intent == "create_task":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para guardar tareas necesito que inicies sesion.",
            }

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito el titulo de la tarea para poder guardarla.",
            }

        due_date = _normalize_date(safe_data.get("date") or safe_data.get("due_date"))
        due_time = _normalize_time(safe_data.get("time") or safe_data.get("due_time"))

        item = create_task(
            user_id=user_id,
            title=title,
            description=_coerce_non_empty_text(safe_data.get("description")),
            due_date=due_date,
            due_time=due_time,
            priority=_normalize_choice(safe_data.get("priority"), VALID_TASK_PRIORITIES, "medium"),
            status=_normalize_choice(safe_data.get("status"), VALID_TASK_STATUSES, "pending"),
        )

        next_data = dict(safe_data)
        next_data["task"] = item
        if item.get("id") is not None:
            next_data["task_id"] = item.get("id")

        return {
            "intent": intent,
            "data": next_data,
            "message": message or "Listo, he guardado la tarea.",
        }

    if intent == "update_task":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para actualizar tareas necesito que inicies sesion.",
            }

        raw_task_id = safe_data.get("task_id", safe_data.get("id"))
        try:
            task_id = int(raw_task_id)
        except (TypeError, ValueError):
            task_id = 0

        if task_id <= 0:
            return {
                "intent": "query",
                "data": {},
                "message": "Indica el ID de la tarea que quieres actualizar.",
            }

        current = get_task(task_id=task_id, user_id=user_id)
        if not current:
            return {
                "intent": "query",
                "data": {},
                "message": f"No encuentro la tarea con ID {task_id}.",
            }

        new_title = _coerce_non_empty_text(safe_data.get("title")) or str(current.get("title") or "")
        if not new_title:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito un titulo valido para actualizar la tarea.",
            }

        if "description" in safe_data:
            new_description = _coerce_non_empty_text(safe_data.get("description"))
        else:
            new_description = current.get("description")

        if "date" in safe_data or "due_date" in safe_data:
            new_due_date = _normalize_date(safe_data.get("date") or safe_data.get("due_date"))
        else:
            new_due_date = current.get("due_date")

        if "time" in safe_data or "due_time" in safe_data:
            new_due_time = _normalize_time(safe_data.get("time") or safe_data.get("due_time"))
        else:
            new_due_time = current.get("due_time")

        if "priority" in safe_data:
            new_priority = _normalize_choice(
                safe_data.get("priority"),
                VALID_TASK_PRIORITIES,
                str(current.get("priority") or "medium"),
            )
        else:
            new_priority = str(current.get("priority") or "medium")

        if "status" in safe_data:
            new_status = _normalize_choice(
                safe_data.get("status"),
                VALID_TASK_STATUSES,
                str(current.get("status") or "pending"),
            )
        else:
            new_status = str(current.get("status") or "pending")

        item = update_task(
            task_id=task_id,
            user_id=user_id,
            title=new_title,
            description=new_description,
            due_date=new_due_date,
            due_time=new_due_time,
            priority=new_priority,
            status=new_status,
        )

        if not item:
            return {
                "intent": "query",
                "data": {},
                "message": f"No pude actualizar la tarea con ID {task_id}.",
            }

        next_data = dict(safe_data)
        next_data["task"] = item
        next_data["task_id"] = task_id
        return {
            "intent": intent,
            "data": next_data,
            "message": message or "Listo, he actualizado la tarea.",
        }

    if intent == "list_tasks":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para ver tus tareas necesito que inicies sesion.",
            }
        return {
            "intent": intent,
            "data": {"tasks": _build_serialized_tasks(user_id)},
            "message": message,
        }

    if intent == "list_meetings":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para ver tus reuniones necesito que inicies sesion.",
            }
        return {
            "intent": intent,
            "data": {"meetings": _build_serialized_meetings(user_id)},
            "message": message,
        }

    if intent == "delete_meetings":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para eliminar reuniones necesito que inicies sesion.",
            }

        meetings = list_meetings(user_id=user_id)
        if not meetings:
            return {
                "intent": intent,
                "data": {"deleted_count": 0, "remaining_meetings": []},
                "message": message or "No habia reuniones para eliminar.",
            }

        all_flag = bool(safe_data.get("all") is True)
        ids_raw = safe_data.get("meeting_ids") or safe_data.get("ids") or []
        ids_to_delete: set[int] = set()
        if isinstance(ids_raw, list):
            for raw_id in ids_raw:
                parsed = _normalize_int(raw_id)
                if parsed is not None:
                    ids_to_delete.add(parsed)
        else:
            single_id = _normalize_int(ids_raw)
            if single_id is not None:
                ids_to_delete.add(single_id)

        title_filter = _coerce_non_empty_text(safe_data.get("title"))
        date_filter = _normalize_date(safe_data.get("date") or safe_data.get("meeting_date"))
        time_filter = _normalize_time(safe_data.get("time") or safe_data.get("meeting_time"))
        location_filter = _coerce_non_empty_text(safe_data.get("location"))

        selected_ids: List[int] = []
        for meeting in meetings:
            mid = _normalize_int(meeting.get("id"))
            if mid is None:
                continue
            if all_flag:
                selected_ids.append(mid)
                continue
            if ids_to_delete and mid in ids_to_delete:
                selected_ids.append(mid)
                continue

            if title_filter:
                meeting_title = _coerce_non_empty_text(meeting.get("title")) or ""
                if meeting_title.lower() != title_filter.lower():
                    continue
            if date_filter:
                if _as_date_string(meeting.get("meeting_date")) != date_filter:
                    continue
            if time_filter:
                if _as_time_string(meeting.get("meeting_time")) != time_filter:
                    continue
            if location_filter:
                meeting_location = _coerce_non_empty_text(meeting.get("location")) or ""
                if meeting_location.lower() != location_filter.lower():
                    continue

            if title_filter or date_filter or time_filter or location_filter:
                selected_ids.append(mid)

        if not selected_ids:
            return {
                "intent": "query",
                "data": {},
                "message": "No tengo claro que reuniones debo eliminar. Dime IDs concretos o confirma 'elimina todas'.",
            }

        deleted_count = 0
        for meeting_id in selected_ids:
            if delete_meeting(meeting_id=meeting_id, user_id=user_id):
                deleted_count += 1

        return {
            "intent": intent,
            "data": {
                "deleted_count": deleted_count,
                "deleted_ids": selected_ids,
                "remaining_meetings": _build_serialized_meetings(user_id),
            },
            "message": message or f"Listo. He eliminado {deleted_count} reuniones.",
        }

    if intent == "create_meeting":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para guardar reuniones necesito que inicies sesion.",
            }

        requested_participants = _normalize_participants_value(safe_data.get("participants"))
        if requested_participants:
            requested_meeting_id = _normalize_int(safe_data.get("meeting_id") or safe_data.get("id"))
            requested_title = _coerce_non_empty_text(safe_data.get("title"))
            requested_date = _normalize_date(safe_data.get("date") or safe_data.get("meeting_date"))
            requested_time = _normalize_time(safe_data.get("time") or safe_data.get("meeting_time"))

            candidate: Dict[str, Any] | None = None
            if requested_meeting_id is not None:
                candidate = get_meeting(meeting_id=requested_meeting_id, user_id=user_id)
            else:
                meetings = list_meetings(user_id=user_id)
                if requested_title:
                    matches: List[Dict[str, Any]] = []
                    for meeting in meetings:
                        meeting_title = _coerce_non_empty_text(meeting.get("title"))
                        if not _titles_match(meeting_title, requested_title):
                            continue
                        if requested_date and _as_date_string(meeting.get("meeting_date")) != requested_date:
                            continue
                        if requested_time and _as_time_string(meeting.get("meeting_time")) != requested_time:
                            continue
                        matches.append(meeting)
                    if len(matches) == 1:
                        candidate = matches[0]
                elif len(meetings) == 1:
                    candidate = meetings[0]

            if candidate and _normalize_int(candidate.get("id")) is not None:
                merged_participants = _merge_participants(
                    _normalize_participants_value(candidate.get("participants")),
                    requested_participants,
                )
                item = update_meeting_participants(
                    meeting_id=int(candidate["id"]),
                    user_id=user_id,
                    participants=merged_participants,
                )
                if item:
                    next_data = dict(safe_data)
                    next_data["meeting"] = item
                    next_data["participants"] = _normalize_participants_value(item.get("participants"))
                    next_data["meeting_id"] = item.get("id")
                    return {
                        "intent": intent,
                        "data": next_data,
                        "message": message
                        or _build_participants_added_message(
                            language="es", participants=requested_participants, meeting=item
                        ),
                    }

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito el titulo de la reunion para poder guardarla.",
            }

        meeting_date = _normalize_date(safe_data.get("date") or safe_data.get("meeting_date"))
        if not meeting_date:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito una fecha valida para la reunion (YYYY-MM-DD).",
            }

        meeting_time = _normalize_time(safe_data.get("time") or safe_data.get("meeting_time"))
        if not meeting_time:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito una hora valida para la reunion (HH:MM).",
            }

        description = _coerce_non_empty_text(safe_data.get("description"))
        duration_minutes = _normalize_int(safe_data.get("duration_minutes"))
        location = _coerce_non_empty_text(safe_data.get("location"))
        status = _normalize_choice(safe_data.get("status"), VALID_MEETING_STATUSES, "scheduled")
        meeting_id = _normalize_int(safe_data.get("meeting_id") or safe_data.get("id"))
        selected_meeting: Dict[str, Any] | None = None
        if meeting_id is not None:
            selected_meeting = get_meeting(meeting_id=meeting_id, user_id=user_id)

        if selected_meeting is None:
            best_match: Dict[str, Any] | None = None
            best_created_at: datetime | None = None
            same_day_candidates: List[Dict[str, Any]] = []
            for meeting in list_meetings(user_id=user_id):
                meeting_title = _coerce_non_empty_text(meeting.get("title"))
                candidate_date = _as_date_string(meeting.get("meeting_date"))
                candidate_time = _as_time_string(meeting.get("meeting_time"))
                if candidate_date == meeting_date:
                    same_day_candidates.append(meeting)
                if not (
                    meeting_title
                    and _titles_match(meeting_title, title)
                    and candidate_date == meeting_date
                    and candidate_time == meeting_time
                ):
                    continue
                created_at = _coerce_datetime(meeting.get("created_at"))
                if best_match is None or (
                    created_at is not None
                    and (best_created_at is None or created_at > best_created_at)
                ):
                    best_match = meeting
                    best_created_at = created_at
            selected_meeting = best_match

            if selected_meeting is None and requested_participants:
                fuzzy_day_matches = [
                    meeting
                    for meeting in same_day_candidates
                    if _titles_match(_coerce_non_empty_text(meeting.get("title")), title)
                ]
                if len(fuzzy_day_matches) == 1:
                    selected_meeting = fuzzy_day_matches[0]

        if selected_meeting and selected_meeting.get("id") is not None:
            existing_description = _coerce_non_empty_text(selected_meeting.get("description"))
            existing_duration = _normalize_int(selected_meeting.get("duration_minutes"))
            existing_location = _coerce_non_empty_text(selected_meeting.get("location"))
            existing_status = _normalize_choice(
                selected_meeting.get("status"), VALID_MEETING_STATUSES, "scheduled"
            )
            existing_participants = _normalize_participants_value(selected_meeting.get("participants"))
            merged_participants = (
                _merge_participants(existing_participants, requested_participants)
                if requested_participants
                else existing_participants
            )
            item = update_meeting(
                meeting_id=int(selected_meeting["id"]),
                user_id=user_id,
                title=title,
                description=description if description is not None else existing_description,
                meeting_date=meeting_date,
                meeting_time=meeting_time,
                duration_minutes=duration_minutes if duration_minutes is not None else existing_duration,
                location=location if location is not None else existing_location,
                status=status or existing_status,
                participants=merged_participants,
            )
            if not item:
                return {
                    "intent": "query",
                    "data": {},
                    "message": "No pude actualizar la reunion existente. ¿Puedes intentarlo de nuevo?",
                }
            default_message = "Listo, he actualizado la reunion."
        else:
            item = create_meeting(
                user_id=user_id,
                title=title,
                description=description,
                meeting_date=meeting_date,
                meeting_time=meeting_time,
                duration_minutes=duration_minutes,
                location=location,
                status=status,
                participants=requested_participants,
            )
            default_message = "Listo, he guardado la reunion."

        next_data = dict(safe_data)
        next_data["meeting"] = item
        next_data["participants"] = _normalize_participants_value(item.get("participants"))
        if item.get("id") is not None:
            next_data["meeting_id"] = item.get("id")

        return {
            "intent": intent,
            "data": next_data,
            "message": message or default_message,
        }

    if intent == "create_event":
        if user_id is None:
            return {
                "intent": "query",
                "data": {},
                "message": "Para guardar eventos necesito que inicies sesion.",
            }

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito el titulo del evento para poder guardarlo.",
            }

        event_date = _normalize_date(safe_data.get("date") or safe_data.get("event_date"))
        if not event_date:
            return {
                "intent": "query",
                "data": {},
                "message": "Necesito una fecha valida para el evento (YYYY-MM-DD).",
            }

        event_time = _normalize_time(safe_data.get("time") or safe_data.get("event_time"))
        item = create_event(
            user_id=user_id,
            title=title,
            description=_coerce_non_empty_text(safe_data.get("description")),
            event_date=event_date,
            event_time=event_time,
            location=_coerce_non_empty_text(safe_data.get("location")),
            event_type=_coerce_non_empty_text(safe_data.get("event_type")) or "general",
        )

        next_data = dict(safe_data)
        next_data["event"] = item
        if item.get("id") is not None:
            next_data["event_id"] = item.get("id")

        return {
            "intent": intent,
            "data": next_data,
            "message": message or "Listo, he guardado el evento.",
        }

    return {
        "intent": intent,
        "data": safe_data,
        "message": message,
    }


def assistant_chat(
    payload: ChatRequest,
    user_id: int | None,
) -> ChatResponse:
    try:
        now = datetime.now(ZoneInfo("Europe/Madrid"))
        tomorrow = now + timedelta(days=1)
        temporal_context = (
            "Referencia temporal del sistema:\n"
            f"- Hoy: {now.strftime('%Y-%m-%d')} ({now.strftime('%A')})\n"
            f"- Mañana: {tomorrow.strftime('%Y-%m-%d')} ({tomorrow.strftime('%A')})\n"
            f"- Mes actual: {now.strftime('%m')}\n"
            f"- Año actual: {now.strftime('%Y')}\n"
            "- Interpreta 'hoy', 'mañana' y fechas relativas usando esta referencia.\n"
            "- Si el usuario indica solo un dia (ejemplo: 'dia 10'), usa automaticamente el mes y año actuales."
        )

        tasks_context = build_tasks_context(user_id)
        meetings_context = build_meetings_context(user_id)
        chunks = rag_service.retrieve(payload.message) if payload.use_rag else []
        rag_context = "\n\n".join(f"Fuente: {c.source}\nContenido: {c.text}" for c in chunks)
        context = f"{temporal_context}\n\n{tasks_context}\n\n{meetings_context}"
        if rag_context:
            context = f"{context}\n\n{rag_context}"
        request_language = _resolve_request_language(payload.language)

        if _looks_like_test_meeting_request(payload.message):
            if user_id is None:
                return ChatResponse(
                    intent="query",
                    data={},
                    message=(
                        "Para crear una reunión de prueba necesito que inicies sesión."
                        if request_language != "en"
                        else "I need you to sign in before I can create a test meeting."
                    ),
                    context_used=[c.source for c in chunks],
                )

            defaults = _build_test_meeting_defaults(language=request_language)
            item = create_meeting(
                user_id=user_id,
                title=defaults["title"],
                description=defaults["description"],
                meeting_date=defaults["meeting_date"],
                meeting_time=defaults["meeting_time"],
                duration_minutes=defaults["duration_minutes"],
                location=defaults["location"],
                status=defaults["status"],
            )
            return ChatResponse(
                intent="create_meeting",
                data={
                    "meeting": item,
                    "meeting_id": item.get("id"),
                    "auto_generated": True,
                },
                message=str(defaults["message"]),
                context_used=[c.source for c in chunks],
            )

        if _looks_like_conversation_closure(payload.message) and _assistant_asked_for_more_changes(
            payload.history
        ):
            return ChatResponse(
                intent="query",
                data={},
                message=_build_closure_message(
                    request_language, user_text=payload.message, history=payload.history
                ),
                context_used=[c.source for c in chunks],
            )

        if _looks_like_meeting_list_request(payload.message):
            meetings = _build_serialized_meetings(user_id) if user_id is not None else []
            return ChatResponse(
                intent="list_meetings",
                data={"meetings": meetings},
                message=_build_meetings_list_message(meetings=meetings, language=request_language),
                context_used=[c.source for c in chunks],
            )

        if user_id is not None and (
            _looks_like_delete_all_meetings_request(payload.message)
            or (
                _looks_like_affirmative(payload.message)
                and _assistant_requested_delete_confirmation(payload.history)
            )
        ):
            deleted_count = 0
            for meeting in list_meetings(user_id=user_id):
                meeting_id = _normalize_int(meeting.get("id"))
                if meeting_id is not None and delete_meeting(meeting_id=meeting_id, user_id=user_id):
                    deleted_count += 1
            return ChatResponse(
                intent="delete_meetings",
                data={"deleted_count": deleted_count, "remaining_meetings": _build_serialized_meetings(user_id)},
                message=_build_delete_all_meetings_message(
                    deleted_count=deleted_count, language=request_language
                ),
                context_used=[c.source for c in chunks],
            )

        if user_id is not None and _assistant_asked_for_participants(payload.history):
            requested_participants = _extract_participants_from_user_text(payload.message)
            if requested_participants:
                meetings = list_meetings(user_id=user_id)
                last_assistant = _get_last_assistant_message(payload.history)
                reference = _extract_meeting_reference_from_text(last_assistant)
                target_meeting = _find_meeting_by_reference(meetings=meetings, reference=reference)
                if not target_meeting:
                    target_meeting = _select_latest_meeting_for_follow_up(meetings)
                if not target_meeting:
                    return ChatResponse(
                        intent="query",
                        data={},
                        message=(
                            "No localizo una reunión reciente para añadir esos participantes. ¿Me indicas la reunión exacta?"
                            if request_language != "en"
                            else "I could not find a recent meeting to add those attendees. Which meeting should I update?"
                        ),
                        context_used=[c.source for c in chunks],
                    )

                meeting_id = _normalize_int(target_meeting.get("id"))
                if meeting_id is None:
                    return ChatResponse(
                        intent="query",
                        data={},
                        message=(
                            "No pude identificar el ID de la reunión a actualizar."
                            if request_language != "en"
                            else "I could not identify the meeting ID to update."
                        ),
                        context_used=[c.source for c in chunks],
                    )

                merged_participants = _merge_participants(
                    _normalize_participants_value(target_meeting.get("participants")),
                    requested_participants,
                )
                updated = update_meeting_participants(
                    meeting_id=meeting_id,
                    user_id=user_id,
                    participants=merged_participants,
                )
                if updated:
                    return ChatResponse(
                        intent="create_meeting",
                        data={
                            "meeting": updated,
                            "meeting_id": updated.get("id"),
                            "participants_added": requested_participants,
                        },
                        message=_build_participants_added_message(
                            language=request_language,
                            participants=requested_participants,
                            meeting=updated,
                        ),
                        context_used=[c.source for c in chunks],
                    )

        if user_id is not None and _assistant_requested_meeting_disambiguation(payload.history):
            requested_participants = _extract_participants_from_user_text(payload.message)
            if requested_participants:
                meetings = list_meetings(user_id=user_id)
                last_assistant = _get_last_assistant_message(payload.history)
                reference = _extract_meeting_reference_from_text(last_assistant)
                target_meeting = _find_meeting_by_reference(meetings=meetings, reference=reference)
                if target_meeting:
                    meeting_id = _normalize_int(target_meeting.get("id"))
                    if meeting_id:
                        merged_participants = _merge_participants(
                            _normalize_participants_value(target_meeting.get("participants")),
                            requested_participants,
                        )
                        updated = update_meeting_participants(
                            meeting_id=meeting_id,
                            user_id=user_id,
                            participants=merged_participants,
                        )
                        if updated:
                            return ChatResponse(
                                intent="create_meeting",
                                data={
                                    "meeting": updated,
                                    "meeting_id": updated.get("id"),
                                    "participants_added": requested_participants,
                                },
                                message=_build_participants_added_message(
                                    language=request_language,
                                    participants=requested_participants,
                                    meeting=updated,
                                ),
                                context_used=[c.source for c in chunks],
                            )

        if user_id is not None and _assistant_requested_meeting_identification(payload.history):
            meetings = list_meetings(user_id=user_id)
            participant_candidates = _extract_participants_from_previous_user_turn(payload.history)
            title_hint = _coerce_non_empty_text(payload.message)
            last_assistant = _get_last_assistant_message(payload.history).lower()
            prefer_tomorrow = (
                "mañana" in last_assistant
                or "manana" in last_assistant
                or "tomorrow" in last_assistant
            )
            prefer_date = (now + timedelta(days=1)).strftime("%Y-%m-%d") if prefer_tomorrow else None

            if meetings and participant_candidates and _looks_like_only_meeting_reference(payload.message):
                if len(meetings) == 1:
                    target_meeting = meetings[0]
                    meeting_id = _normalize_int(target_meeting.get("id"))
                    if meeting_id:
                        merged_participants = _merge_participants(
                            _normalize_participants_value(target_meeting.get("participants")),
                            participant_candidates,
                        )
                        updated = update_meeting_participants(
                            meeting_id=meeting_id,
                            user_id=user_id,
                            participants=merged_participants,
                        )
                        if updated:
                            return ChatResponse(
                                intent="create_meeting",
                                data={
                                    "meeting": updated,
                                    "meeting_id": updated.get("id"),
                                    "participants_added": participant_candidates,
                                },
                                message=_build_participants_added_message(
                                    language=request_language,
                                    participants=participant_candidates,
                                    meeting=updated,
                                ),
                                context_used=[c.source for c in chunks],
                            )

            if meetings and participant_candidates and title_hint:
                target_meeting = _select_meeting_by_title(
                    meetings=meetings,
                    title=title_hint,
                    prefer_date=prefer_date,
                )
                if target_meeting:
                    meeting_id = _normalize_int(target_meeting.get("id"))
                    if meeting_id:
                        merged_participants = _merge_participants(
                            _normalize_participants_value(target_meeting.get("participants")),
                            participant_candidates,
                        )
                        updated = update_meeting_participants(
                            meeting_id=meeting_id,
                            user_id=user_id,
                            participants=merged_participants,
                        )
                        if updated:
                            return ChatResponse(
                                intent="create_meeting",
                                data={
                                    "meeting": updated,
                                    "meeting_id": updated.get("id"),
                                    "participants_added": participant_candidates,
                                },
                                message=_build_participants_added_message(
                                    language=request_language,
                                    participants=participant_candidates,
                                    meeting=updated,
                                ),
                                context_used=[c.source for c in chunks],
                            )

        result = ai_service.chat_json(
            payload.message,
            context=context,
            history=payload.history,
            language=request_language,
        )
        if _looks_like_meeting_list_request(payload.message):
            result = {**result, "intent": "list_meetings"}
        final_result = _apply_intent_side_effects(result, user_id=user_id)

        return ChatResponse(
            intent=str(final_result.get("intent", "query")),
            data=final_result.get("data", {})
            if isinstance(final_result.get("data", {}), dict)
            else {},
            message=str(final_result.get("message", "")),
            context_used=[c.source for c in chunks],
        )
    except RuntimeError:
        # Keep chat available even if the LLM provider is temporarily unavailable.
        return ChatResponse(
            intent="query",
            data={},
            message=(
                "Ahora mismo no puedo conectar con el motor de IA. "
                "Intenta de nuevo en unos segundos."
            ),
            context_used=[],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"assistant_error: {exc}") from exc


def assistant_reindex() -> Dict[str, int]:
    chunks = rag_service.rebuild_index()
    return {"chunks": chunks}

