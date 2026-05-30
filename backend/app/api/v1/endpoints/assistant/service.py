from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from app.db.postgresql.event_repository import (
    create_event,
    delete_event,
    get_event,
    list_events,
    update_event,
)
from app.db.postgresql.meeting_repository import (
    create_meeting,
    delete_meeting,
    get_meeting,
    list_meetings,
    update_meeting,
    update_meeting_participants,
)
from app.db.postgresql.notes_repository import (
    create_note,
    delete_note,
    get_note,
    list_notes,
    update_note,
)
from app.db.postgresql.task_repository import (
    create_task,
    delete_task,
    get_task,
    list_tasks,
    update_task,
)
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service
from .schemas import ChatRequest, ChatResponse


VALID_TASK_PRIORITIES = {"low", "medium", "high"}
VALID_TASK_STATUSES = {"pending", "done"}
VALID_MEETING_STATUSES = {"scheduled", "completed", "cancelled"}

def build_tasks_context(user_id: int | None) -> str:
    """Serializa tareas recientes para que el LLM pueda responder con contexto."""
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


def build_notes_context(user_id: int | None) -> str:
    """Serializa notas recientes del usuario para incluirlas en el prompt."""
    if user_id is None:
        return "Contexto de notas del usuario: no autenticado."

    notes = list_notes(user_id=user_id)
    if not notes:
        return "Contexto de notas del usuario: no hay notas registradas."

    rows: List[str] = []
    for note in notes[:20]:
        content_preview = str(note.get("content") or "")[:80]
        rows.append(
            "- "
            f"id={note.get('id')}; "
            f"titulo={note.get('title')}; "
            f"estado={note.get('status') or 'active'}; "
            f"contenido={content_preview}"
        )

    return "Contexto de notas del usuario:\n" + "\n".join(rows)


def build_meetings_context(user_id: int | None) -> str:
    """Serializa reuniones del usuario con participantes normalizados."""
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

def build_events_context(user_id: int | None) -> str:
    """Serializa eventos del usuario para alimentar el contexto conversacional."""
    if user_id is None:
        return "Contexto de eventos del usuario: no autenticado."

    events = list_events(user_id=user_id)
    if not events:
        return "Contexto de eventos del usuario: no hay eventos registrados."

    rows: List[str] = []
    for event in events[:30]:
        rows.append(
            "- "
            f"id={event.get('id')}; "
            f"titulo={event.get('title')}; "
            f"fecha={_as_date_string(event.get('event_date')) or 'sin fecha'}; "
            f"hora={_as_time_string(event.get('event_time')) or 'sin hora'}; "
            f"tipo={event.get('event_type') or 'general'}; "
            f"ubicacion={event.get('location') or 'sin ubicacion'}"
        )

    return "Contexto de eventos del usuario:\n" + "\n".join(rows)

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

def _build_serialized_notes(user_id: int) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for note in list_notes(user_id=user_id):
        serialized.append(
            {
                "id": note.get("id"),
                "title": note.get("title"),
                "content": note.get("content") or "",
                "status": note.get("status") or "active",
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

def _apply_intent_side_effects(
    result: Dict[str, Any],
    *,
    user_id: int | None,
) -> Dict[str, Any]:
    """Aplica cambios de base de datos derivados del intent devuelto por el LLM."""
    intent = str(result.get("intent", "query"))
    data = result.get("data", {})
    safe_data = data if isinstance(data, dict) else {}
    message = str(result.get("message", "")).strip()

    if intent == "create_task":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para guardar tareas necesito que inicies sesion."}

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {"intent": "query", "data": {}, "message": "Necesito el titulo de la tarea para poder guardarla."}

        item = create_task(
            user_id=user_id,
            title=title,
            description=_coerce_non_empty_text(safe_data.get("description")),
            due_date=_normalize_date(safe_data.get("date") or safe_data.get("due_date")),
            due_time=_normalize_time(safe_data.get("time") or safe_data.get("due_time")),
            priority=_normalize_choice(safe_data.get("priority"), VALID_TASK_PRIORITIES, "medium"),
            status=_normalize_choice(safe_data.get("status"), VALID_TASK_STATUSES, "pending"),
        )
        next_data = dict(safe_data)
        next_data["task"] = item
        if item.get("id") is not None:
            next_data["task_id"] = item.get("id")
        return {"intent": intent, "data": next_data, "message": message or "Listo, he guardado la tarea."}

    if intent == "create_tasks":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para guardar tareas necesito que inicies sesion."}

        raw_tasks = safe_data.get("tasks")
        if not isinstance(raw_tasks, list) or not raw_tasks:
            return {"intent": "query", "data": {}, "message": "No encontré ninguna tarea en tu mensaje. ¿Puedes listarlas de nuevo?"}

        created: List[Dict[str, Any]] = []
        skipped: List[str] = []
        for entry in raw_tasks:
            if not isinstance(entry, dict):
                continue
            title = _coerce_non_empty_text(entry.get("title"))
            if not title:
                skipped.append(str(entry))
                continue
            item = create_task(
                user_id=user_id,
                title=title,
                description=_coerce_non_empty_text(entry.get("description")),
                due_date=_normalize_date(entry.get("date") or entry.get("due_date")),
                due_time=_normalize_time(entry.get("time") or entry.get("due_time")),
                priority=_normalize_choice(entry.get("priority"), VALID_TASK_PRIORITIES, "medium"),
                status="pending",
            )
            created.append(item)

        if not created:
            return {"intent": "query", "data": {}, "message": "No pude crear ninguna tarea. Asegúrate de que cada una tenga título."}

        count = len(created)
        default_msg = message or f"Listo, he creado {count} {'tarea' if count == 1 else 'tareas'} correctamente."
        return {"intent": intent, "data": {"tasks": created, "count": count}, "message": default_msg}

    if intent == "update_task":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para actualizar tareas necesito que inicies sesion."}

        raw_task_id = safe_data.get("task_id", safe_data.get("id"))
        try:
            task_id = int(raw_task_id)
        except (TypeError, ValueError):
            task_id = 0

        if task_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID de la tarea que quieres actualizar."}

        current = get_task(task_id=task_id, user_id=user_id)
        if not current:
            return {"intent": "query", "data": {}, "message": f"No encuentro la tarea con ID {task_id}."}

        new_title = _coerce_non_empty_text(safe_data.get("title")) or str(current.get("title") or "")
        if not new_title:
            return {"intent": "query", "data": {}, "message": "Necesito un titulo valido para actualizar la tarea."}

        new_description = (
            _coerce_non_empty_text(safe_data.get("description"))
            if "description" in safe_data
            else current.get("description")
        )
        new_due_date = (
            _normalize_date(safe_data.get("date") or safe_data.get("due_date"))
            if ("date" in safe_data or "due_date" in safe_data)
            else current.get("due_date")
        )
        new_due_time = (
            _normalize_time(safe_data.get("time") or safe_data.get("due_time"))
            if ("time" in safe_data or "due_time" in safe_data)
            else current.get("due_time")
        )
        new_priority = (
            _normalize_choice(safe_data.get("priority"), VALID_TASK_PRIORITIES, str(current.get("priority") or "medium"))
            if "priority" in safe_data
            else str(current.get("priority") or "medium")
        )
        new_status = (
            _normalize_choice(safe_data.get("status"), VALID_TASK_STATUSES, str(current.get("status") or "pending"))
            if "status" in safe_data
            else str(current.get("status") or "pending")
        )

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
            return {"intent": "query", "data": {}, "message": f"No pude actualizar la tarea con ID {task_id}."}

        next_data = dict(safe_data)
        next_data["task"] = item
        next_data["task_id"] = task_id
        return {"intent": intent, "data": next_data, "message": message or "Listo, he actualizado la tarea."}

    if intent == "delete_task":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para eliminar tareas necesito que inicies sesion."}

        raw_task_id = safe_data.get("task_id", safe_data.get("id"))
        try:
            task_id = int(raw_task_id)
        except (TypeError, ValueError):
            task_id = 0

        if task_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID de la tarea que quieres eliminar."}

        deleted = delete_task(task_id=task_id, user_id=user_id)
        if not deleted:
            return {"intent": "query", "data": {}, "message": f"No encontre la tarea con ID {task_id} para eliminar."}

        return {
            "intent": intent,
            "data": {"deleted_task_id": task_id, "remaining_tasks": _build_serialized_tasks(user_id)},
            "message": message or "Listo. He eliminado la tarea.",
        }

    if intent == "list_tasks":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para ver tus tareas necesito que inicies sesion."}
        return {"intent": intent, "data": {"tasks": _build_serialized_tasks(user_id)}, "message": message}

    if intent == "create_event":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para guardar eventos necesito que inicies sesion."}

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {"intent": "query", "data": {}, "message": "Necesito el titulo del evento para poder guardarlo."}

        event_date = _normalize_date(safe_data.get("date") or safe_data.get("event_date"))
        if not event_date:
            return {"intent": "query", "data": {}, "message": "Necesito una fecha valida para el evento (YYYY-MM-DD)."}

        item = create_event(
            user_id=user_id,
            title=title,
            description=_coerce_non_empty_text(safe_data.get("description")),
            event_date=event_date,
            event_time=_normalize_time(safe_data.get("time") or safe_data.get("event_time")),
            location=_coerce_non_empty_text(safe_data.get("location")),
            event_type=_coerce_non_empty_text(safe_data.get("event_type")) or "general",
        )
        next_data = dict(safe_data)
        next_data["event"] = item
        if item.get("id") is not None:
            next_data["event_id"] = item.get("id")
        return {"intent": intent, "data": next_data, "message": message or "Listo, he guardado el evento."}

    if intent == "update_event":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para actualizar eventos necesito que inicies sesion."}

        raw_event_id = safe_data.get("event_id", safe_data.get("id"))
        try:
            event_id = int(raw_event_id)
        except (TypeError, ValueError):
            event_id = 0

        if event_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID del evento que quieres actualizar."}

        current = get_event(event_id=event_id, user_id=user_id)
        if not current:
            return {"intent": "query", "data": {}, "message": f"No encuentro el evento con ID {event_id}."}

        new_title = _coerce_non_empty_text(safe_data.get("title")) or str(current.get("title") or "")
        new_event_date = (
            _normalize_date(safe_data.get("date") or safe_data.get("event_date"))
            or _as_date_string(current.get("event_date"))
            or ""
        )
        new_event_time = (
            _normalize_time(safe_data.get("time") or safe_data.get("event_time"))
            if ("time" in safe_data or "event_time" in safe_data)
            else _as_time_string(current.get("event_time"))
        )
        new_location = (
            _coerce_non_empty_text(safe_data.get("location"))
            if "location" in safe_data
            else _coerce_non_empty_text(current.get("location"))
        )
        new_description = (
            _coerce_non_empty_text(safe_data.get("description"))
            if "description" in safe_data
            else _coerce_non_empty_text(current.get("description"))
        )

        item = update_event(
            event_id=event_id,
            user_id=user_id,
            title=new_title,
            description=new_description,
            event_date=new_event_date,
            event_time=new_event_time,
            location=new_location,
            event_type=str(current.get("event_type") or "general"),
        )
        if not item:
            return {"intent": "query", "data": {}, "message": f"No pude actualizar el evento con ID {event_id}."}

        next_data = dict(safe_data)
        next_data["event"] = item
        next_data["event_id"] = event_id
        return {"intent": intent, "data": next_data, "message": message or "Listo, he actualizado el evento."}

    if intent == "delete_event":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para eliminar eventos necesito que inicies sesion."}

        raw_event_id = safe_data.get("event_id", safe_data.get("id"))
        try:
            event_id = int(raw_event_id)
        except (TypeError, ValueError):
            event_id = 0

        if event_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID del evento que quieres eliminar."}

        deleted = delete_event(event_id=event_id, user_id=user_id)
        if not deleted:
            return {"intent": "query", "data": {}, "message": f"No encontre el evento con ID {event_id} para eliminar."}

        return {
            "intent": intent,
            "data": {"deleted_event_id": event_id},
            "message": message or "Listo. He eliminado el evento.",
        }

    if intent == "create_meeting":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para guardar reuniones necesito que inicies sesion."}

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
                        "message": message or _build_participants_added_message(
                            language="es", participants=requested_participants, meeting=item
                        ),
                    }

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {"intent": "query", "data": {}, "message": "Necesito el titulo de la reunion para poder guardarla."}

        meeting_date = _normalize_date(safe_data.get("date") or safe_data.get("meeting_date"))
        if not meeting_date:
            return {"intent": "query", "data": {}, "message": "Necesito una fecha valida para la reunion (YYYY-MM-DD)."}

        meeting_time = _normalize_time(safe_data.get("time") or safe_data.get("meeting_time"))
        if not meeting_time:
            return {"intent": "query", "data": {}, "message": "Necesito una hora valida para la reunion (HH:MM)."}

        description = _coerce_non_empty_text(safe_data.get("description"))
        duration_minutes = _normalize_int(safe_data.get("duration_minutes"))
        location = _coerce_non_empty_text(safe_data.get("location"))
        status = _normalize_choice(safe_data.get("status"), VALID_MEETING_STATUSES, "scheduled")
        selected_meeting: Dict[str, Any] | None = None
        meeting_id = _normalize_int(safe_data.get("meeting_id") or safe_data.get("id"))
        if meeting_id is not None:
            selected_meeting = get_meeting(meeting_id=meeting_id, user_id=user_id)

        if selected_meeting is None:
            best_match: Dict[str, Any] | None = None
            best_created_at: datetime | None = None
            for meeting in list_meetings(user_id=user_id):
                m_title = _coerce_non_empty_text(meeting.get("title"))
                m_date = _as_date_string(meeting.get("meeting_date"))
                m_time = _as_time_string(meeting.get("meeting_time"))
                if not (_titles_match(m_title, title) and m_date == meeting_date and m_time == meeting_time):
                    continue
                created_at = _coerce_datetime(meeting.get("created_at"))
                if best_match is None or (
                    created_at is not None and (best_created_at is None or created_at > best_created_at)
                ):
                    best_match = meeting
                    best_created_at = created_at
            selected_meeting = best_match

        if selected_meeting and selected_meeting.get("id") is not None:
            existing_participants = _normalize_participants_value(selected_meeting.get("participants"))
            merged = _merge_participants(existing_participants, requested_participants) if requested_participants else existing_participants
            item = update_meeting(
                meeting_id=int(selected_meeting["id"]),
                user_id=user_id,
                title=title,
                description=description if description is not None else _coerce_non_empty_text(selected_meeting.get("description")),
                meeting_date=meeting_date,
                meeting_time=meeting_time,
                duration_minutes=duration_minutes if duration_minutes is not None else _normalize_int(selected_meeting.get("duration_minutes")),
                location=location if location is not None else _coerce_non_empty_text(selected_meeting.get("location")),
                status=status or _normalize_choice(selected_meeting.get("status"), VALID_MEETING_STATUSES, "scheduled"),
                participants=merged,
            )
            if not item:
                return {"intent": "query", "data": {}, "message": "No pude actualizar la reunion existente. ¿Puedes intentarlo de nuevo?"}
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
        return {"intent": intent, "data": next_data, "message": message or default_message}

    if intent == "list_meetings":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para ver tus reuniones necesito que inicies sesion."}
        return {"intent": intent, "data": {"meetings": _build_serialized_meetings(user_id)}, "message": message}

    if intent == "delete_meetings":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para eliminar reuniones necesito que inicies sesion."}

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
                m_title = _coerce_non_empty_text(meeting.get("title")) or ""
                if m_title.lower() != title_filter.lower():
                    continue
            if date_filter:
                if _as_date_string(meeting.get("meeting_date")) != date_filter:
                    continue
            if time_filter:
                if _as_time_string(meeting.get("meeting_time")) != time_filter:
                    continue
            if location_filter:
                m_location = _coerce_non_empty_text(meeting.get("location")) or ""
                if m_location.lower() != location_filter.lower():
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

    if intent == "create_note":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para guardar notas necesito que inicies sesion."}

        title = _coerce_non_empty_text(safe_data.get("title"))
        if not title:
            return {"intent": "query", "data": {}, "message": "Necesito el titulo de la nota para poder guardarla."}

        item = create_note(
            user_id=user_id,
            title=title,
            content=_coerce_non_empty_text(safe_data.get("content")),
            status=_normalize_choice(safe_data.get("status"), {"active", "archived"}, "active"),
        )
        next_data = dict(safe_data)
        next_data["note"] = item
        if item.get("id") is not None:
            next_data["note_id"] = item.get("id")
        return {"intent": intent, "data": next_data, "message": message or "Listo, he guardado la nota."}

    if intent == "update_note":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para actualizar notas necesito que inicies sesion."}

        raw_note_id = safe_data.get("note_id", safe_data.get("id"))
        try:
            note_id = int(raw_note_id)
        except (TypeError, ValueError):
            note_id = 0

        if note_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID de la nota que quieres actualizar."}

        current = get_note(note_id=note_id, user_id=user_id)
        if not current:
            return {"intent": "query", "data": {}, "message": f"No encuentro la nota con ID {note_id}."}

        new_title = _coerce_non_empty_text(safe_data.get("title")) or str(current.get("title") or "")
        if not new_title:
            return {"intent": "query", "data": {}, "message": "Necesito un titulo valido para actualizar la nota."}

        new_content = (
            _coerce_non_empty_text(safe_data.get("content"))
            if "content" in safe_data
            else current.get("content")
        )
        new_status = (
            _normalize_choice(safe_data.get("status"), {"active", "archived"}, str(current.get("status") or "active"))
            if "status" in safe_data
            else str(current.get("status") or "active")
        )

        item = update_note(note_id=note_id, user_id=user_id, title=new_title, content=new_content, status=new_status)
        if not item:
            return {"intent": "query", "data": {}, "message": f"No pude actualizar la nota con ID {note_id}."}

        next_data = dict(safe_data)
        next_data["note"] = item
        next_data["note_id"] = note_id
        return {"intent": intent, "data": next_data, "message": message or "Listo, he actualizado la nota."}

    if intent == "delete_note":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para eliminar notas necesito que inicies sesion."}

        raw_note_id = safe_data.get("note_id", safe_data.get("id"))
        try:
            note_id = int(raw_note_id)
        except (TypeError, ValueError):
            note_id = 0

        if note_id <= 0:
            return {"intent": "query", "data": {}, "message": "Indica el ID de la nota que quieres eliminar."}

        deleted = delete_note(note_id=note_id, user_id=user_id)
        if not deleted:
            return {"intent": "query", "data": {}, "message": f"No encontre la nota con ID {note_id} para eliminar."}

        return {
            "intent": intent,
            "data": {"deleted_note_id": note_id, "remaining_notes": _build_serialized_notes(user_id)},
            "message": message or f"Listo. He eliminado la nota con ID {note_id}.",
        }

    if intent == "list_notes":
        if user_id is None:
            return {"intent": "query", "data": {}, "message": "Para ver tus notas necesito que inicies sesion."}

        notes = _build_serialized_notes(user_id)
        if not notes:
            default_msg = "No tienes notas guardadas."
        else:
            lines = [f"- {n['title']} (id={n['id']}, estado={n['status']})" for n in notes[:10]]
            default_msg = "Estas son tus notas:\n" + "\n".join(lines)

        return {"intent": intent, "data": {"notes": notes}, "message": message or default_msg}

    return {"intent": intent, "data": safe_data, "message": message}

def assistant_chat(
    payload: ChatRequest,
    user_id: int | None,
) -> ChatResponse:
    """Resuelve una peticion de chat completa y devuelve una respuesta API estable."""
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
        notes_context = build_notes_context(user_id)
        events_context = build_events_context(user_id)
        chunks = rag_service.retrieve(payload.message) if payload.use_rag else []
        rag_context = "\n\n".join(f"Fuente: {c.source}\nContenido: {c.text}" for c in chunks)

        context = f"{temporal_context}\n\n{tasks_context}\n\n{meetings_context}\n\n{notes_context}\n\n{events_context}"
        if rag_context:
            context = f"{context}\n\n{rag_context}"

        request_language = _resolve_request_language(payload.language)

        result = ai_service.chat_json(
            payload.message,
            context=context,
            history=payload.history,
            language=request_language,
        )
        final_result = _apply_intent_side_effects(result, user_id=user_id)

        return ChatResponse(
            intent=str(final_result.get("intent", "query")),
            data=final_result.get("data", {}) if isinstance(final_result.get("data", {}), dict) else {},
            message=str(final_result.get("message", "")),
            context_used=[c.source for c in chunks],
        )
    except RuntimeError:
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
    """Reconstruye el indice RAG expuesto por el endpoint de mantenimiento."""
    chunks = rag_service.rebuild_index()
    return {"chunks": chunks}
