from __future__ import annotations

from typing import Any, Dict, List

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.security import decode_access_token
from app.db.postgresql.event_repository import (
    create_event,
    delete_event,
    get_event,
    list_events,
    set_gcal_event_id,
    update_event,
)
from app.db.postgresql.meeting_repository import (
    create_meeting,
    delete_meeting,
    get_meeting,
    list_meetings,
    update_meeting,
)
from app.db.postgresql.task_repository import (
    create_task,
    delete_task,
    get_task,
    list_tasks,
    update_task,
)

from app.db.postgresql.notes_repository import (
    create_note,
    delete_note,
    get_note,
    list_notes,
    update_note,
)
from app.db.postgresql.user_repository import get_user_by_id

router = APIRouter(prefix="/planner", tags=["planner"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_authenticated_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Token de acceso requerido")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido") from None

    raw_uid = payload.get("uid")
    if not isinstance(raw_uid, int):
        raise HTTPException(status_code=401, detail="Token invalido")

    if get_user_by_id(raw_uid) is None:
        raise HTTPException(status_code=401, detail="Token invalido")

    return raw_uid


class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=190)
    description: str | None = None
    due_date: str | None = None
    due_time: str | None = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    status: str = Field(default="pending", pattern="^(pending|in_progress|done)$")


class TaskUpdateRequest(TaskCreateRequest):
    pass


class MeetingCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=190)
    description: str | None = None
    meeting_date: str
    meeting_time: str
    duration_minutes: int | None = None
    location: str | None = None
    participants: List[str] = Field(default_factory=list)
    status: str = Field(default="scheduled", pattern="^(scheduled|completed|cancelled)$")


class MeetingUpdateRequest(MeetingCreateRequest):
    pass


class EventCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=190)
    description: str | None = None
    event_date: str
    event_time: str | None = None
    location: str | None = None
    event_type: str = Field(default="general", max_length=80)


class EventUpdateRequest(EventCreateRequest):
    pass


class NoteCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=190)
    content: str | None = None
    status: str = Field(default="active", pattern="^(active|archived)$")


class NoteUpdateRequest(NoteCreateRequest):
    pass


@router.get("/tasks")
def api_list_tasks(user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, List[Dict[str, Any]]]:
    return {"items": list_tasks(user_id=user_id)}


@router.post("/tasks")
def api_create_task(
    payload: TaskCreateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = create_task(
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        due_date=payload.due_date,
        due_time=payload.due_time,
        priority=payload.priority,
        status=payload.status,
    )
    return {"item": item}


@router.get("/tasks/{task_id}")
def api_get_task(task_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, Any]:
    item = get_task(task_id=task_id, user_id=user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"item": item}


@router.put("/tasks/{task_id}")
def api_update_task(
    task_id: int,
    payload: TaskUpdateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = update_task(
        task_id=task_id,
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        due_date=payload.due_date,
        due_time=payload.due_time,
        priority=payload.priority,
        status=payload.status,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"item": item}


@router.delete("/tasks/{task_id}")
def api_delete_task(task_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, bool]:
    deleted = delete_task(task_id=task_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"ok": True}


@router.get("/meetings")
def api_list_meetings(user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, List[Dict[str, Any]]]:
    return {"items": list_meetings(user_id=user_id)}


@router.post("/meetings")
def api_create_meeting(
    payload: MeetingCreateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = create_meeting(
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        meeting_date=payload.meeting_date,
        meeting_time=payload.meeting_time,
        duration_minutes=payload.duration_minutes,
        location=payload.location,
        participants=payload.participants,
        status=payload.status,
    )
    return {"item": item}


@router.get("/meetings/{meeting_id}")
def api_get_meeting(meeting_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, Any]:
    item = get_meeting(meeting_id=meeting_id, user_id=user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reunion no encontrada")
    return {"item": item}


@router.put("/meetings/{meeting_id}")
def api_update_meeting(
    meeting_id: int,
    payload: MeetingUpdateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = update_meeting(
        meeting_id=meeting_id,
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        meeting_date=payload.meeting_date,
        meeting_time=payload.meeting_time,
        duration_minutes=payload.duration_minutes,
        location=payload.location,
        participants=payload.participants,
        status=payload.status,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Reunion no encontrada")
    return {"item": item}


@router.delete("/meetings/{meeting_id}")
def api_delete_meeting(meeting_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, bool]:
    deleted = delete_meeting(meeting_id=meeting_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reunion no encontrada")
    return {"ok": True}


@router.get("/events")
def api_list_events(user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, List[Dict[str, Any]]]:
    return {"items": list_events(user_id=user_id)}


@router.post("/events")
def api_create_event(
    payload: EventCreateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = create_event(
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        event_date=payload.event_date,
        event_time=payload.event_time,
        location=payload.location,
        event_type=payload.event_type,
    )

    
    try:
        from app.services import google_calendar_service as gcal
        from datetime import datetime, timedelta, timezone

        if payload.event_time:
            start_dt = datetime.fromisoformat(f"{payload.event_date}T{payload.event_time}").replace(tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(hours=1)
            gcal_start = {"dateTime": start_dt.isoformat(), "timeZone": "UTC"}
            gcal_end = {"dateTime": end_dt.isoformat(), "timeZone": "UTC"}
        else:
            from datetime import date, timedelta as td
            next_day = (date.fromisoformat(payload.event_date) + td(days=1)).isoformat()
            gcal_start = {"date": payload.event_date}
            gcal_end = {"date": next_day}

        body: Dict[str, Any] = {"summary": payload.title.strip(), "start": gcal_start, "end": gcal_end}
        if payload.description:
            body["description"] = payload.description
        if payload.location:
            body["location"] = payload.location

        gcal_event = gcal.create_event(user_id, body)
        gcal_id: str = gcal_event.get("id", "")
        if gcal_id:
            set_gcal_event_id(event_id=int(item["id"]), user_id=user_id, gcal_event_id=gcal_id)
            item["gcal_event_id"] = gcal_id
    except Exception:
        pass  

    return {"item": item}


@router.get("/events/{event_id}")
def api_get_event(event_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, Any]:
    item = get_event(event_id=event_id, user_id=user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"item": item}


@router.put("/events/{event_id}")
def api_update_event(
    event_id: int,
    payload: EventUpdateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = update_event(
        event_id=event_id,
        user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        event_date=payload.event_date,
        event_time=payload.event_time,
        location=payload.location,
        event_type=payload.event_type,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"item": item}


@router.delete("/events/{event_id}")
def api_delete_event(event_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, bool]:
    deleted = delete_event(event_id=event_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"ok": True}


@router.get("/notes")
def api_list_notes(user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, List[Dict[str, Any]]]:
    return {"items": list_notes(user_id=user_id)}


@router.post("/notes")
def api_create_note(
    payload: NoteCreateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = create_note(
        user_id=user_id,
        title=payload.title.strip(),
        content=payload.content,
        status=payload.status,
    )
    return {"item": item}


@router.get("/notes/{note_id}")
def api_get_note(note_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, Any]:
    item = get_note(note_id=note_id, user_id=user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return {"item": item}


@router.put("/notes/{note_id}")
def api_update_note(
    note_id: int,
    payload: NoteUpdateRequest,
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, Any]:
    item = update_note(
        note_id=note_id,
        user_id=user_id,
        title=payload.title.strip(),
        content=payload.content,
        status=payload.status,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return {"item": item}


@router.delete("/notes/{note_id}")
def api_delete_note(note_id: int, user_id: int = Depends(get_authenticated_user_id)) -> Dict[str, bool]:
    deleted = delete_note(note_id=note_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return {"ok": True}

