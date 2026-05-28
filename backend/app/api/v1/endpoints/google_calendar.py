from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request as _urllib
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt as _jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.api.v1.endpoints.auth import get_authenticated_user_id
from app.db.postgresql.user_repository import (
    update_google_tokens,
    update_gcal_watch,
    get_user_by_channel_id,
)
from app.services import google_calendar_service as gcal

router = APIRouter(prefix="/google-calendar", tags=["google-calendar"])

_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
_OAUTH_SECRET = os.environ.get("JWT_SECRET_KEY", "")
_CALLBACK_URL = os.environ.get(
    "GOOGLE_CALLBACK_URL",
    "https://apidelvo.gromber05.dev/api/v1/google-calendar/callback",
)
_SCOPES = "email https://www.googleapis.com/auth/calendar"


def _fail_redirect(platform: str) -> RedirectResponse:
    if platform == "web":
        return RedirectResponse("https://delvo.gromber05.dev/es/settings?google=error", status_code=302)
    return RedirectResponse("delvo://oauth-done?status=error", status_code=302)


@router.get("/connect")
def google_calendar_connect(
    platform: str = "mobile",
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    state = _jwt.encode(
        {
            "uid": user_id,
            "platform": platform,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        _OAUTH_SECRET,
        algorithm="HS256",
    )
    params = urllib.parse.urlencode({
        "client_id": _CLIENT_ID,
        "redirect_uri": _CALLBACK_URL,
        "response_type": "code",
        "scope": _SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}

@router.get("/callback")
def google_calendar_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Google OAuth callback exchanges code, saves tokens, redirects back."""
    if error or not code or not state:
        return _fail_redirect("mobile")

    try:
        state_data = _jwt.decode(state, _OAUTH_SECRET, algorithms=["HS256"])
        user_id: int = int(state_data["uid"])
        platform: str = state_data.get("platform", "mobile")
    except Exception:
        return _fail_redirect("mobile")

    try:
        post_data = urllib.parse.urlencode({
            "code": code,
            "client_id": _CLIENT_ID,
            "client_secret": _CLIENT_SECRET,
            "redirect_uri": _CALLBACK_URL,
            "grant_type": "authorization_code",
        }).encode()
        req = _urllib.Request("https://oauth2.googleapis.com/token", data=post_data, method="POST")
        with _urllib.urlopen(req, timeout=10) as resp:
            token_data: dict[str, Any] = json.loads(resp.read())
    except Exception:
        return _fail_redirect(platform)

    access_token: str = str(token_data.get("access_token", ""))
    refresh_token: str | None = token_data.get("refresh_token")
    expires_in: int = int(token_data.get("expires_in", 3600))
    expiry = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    google_email: str | None = None
    try:
        req = _urllib.Request(  
            "https://www.googleapis.com/userinfo/v2/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with _urllib.urlopen(req, timeout=10) as resp:
            google_email = json.loads(resp.read()).get("email")
    except Exception:
        pass

    update_google_tokens(
        user_id=user_id,
        google_access_token=access_token,
        google_refresh_token=refresh_token,
        google_token_expiry=expiry,
        google_email=google_email,
    )
    try:
        import uuid
        channel_id = str(uuid.uuid4())
        watch_result = gcal.register_watch(user_id, channel_id)
        expiry_ms = watch_result.get("expiration")
        expiry_iso = (
            datetime.fromtimestamp(int(expiry_ms) / 1000, tz=timezone.utc).isoformat()
            if expiry_ms else None
        )
        update_gcal_watch(user_id=user_id, channel_id=channel_id, expiry=expiry_iso)
    except Exception:
        pass

    if platform == "web":
        return RedirectResponse("https://delvo.gromber05.dev/es/settings?google=ok", status_code=302)

    email_param = f"&email={urllib.parse.quote(google_email)}" if google_email else ""
    return RedirectResponse(f"delvo://oauth-done?status=ok{email_param}", status_code=302)

@router.post("/webhook", status_code=200)
async def google_calendar_webhook(request: Request) -> dict[str, str]:
    """
    Receives Google Calendar push notifications.
    Google sends a POST with channel info in headers whenever events change.
    We look up the user by channel ID and trigger a sync.
    """
    channel_id = request.headers.get("X-Goog-Channel-Id", "")
    resource_state = request.headers.get("X-Goog-Resource-State", "")
    if resource_state == "sync" or not channel_id:
        return {"status": "ok"}

    user = get_user_by_channel_id(channel_id)
    if not user:
        return {"status": "unknown_channel"}

    try:
        gcal.sync_events(int(user["id"]))
    except Exception:
        pass

    return {"status": "synced"}

@router.post("/sync")
def google_calendar_sync(
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    """Import upcoming Google Calendar events as local Delvo events."""
    try:
        result = gcal.sync_events(user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise _gcal_error(e)

class EventDateTime(BaseModel):
    dateTime: str | None = None
    date: str | None = None
    timeZone: str | None = None

class CalendarEventBody(BaseModel):
    summary: str
    description: str | None = None
    location: str | None = None
    start: EventDateTime
    end: EventDateTime
    attendees: list[dict[str, Any]] | None = None

def _gcal_error(e: Exception) -> HTTPException:
    import traceback, logging
    logging.error("Google Calendar error: %s\n%s", e, traceback.format_exc())
    msg = str(e)
    if "invalid_grant" in msg or "Token has been expired" in msg:
        return HTTPException(status_code=401, detail="Token de Google expirado, vuelve a vincular tu cuenta")
    return HTTPException(status_code=502, detail=f"Error de Google Calendar: {msg}")

@router.get("/events")
def get_events(
    time_min: str | None = Query(None, description="RFC3339, e.g. 2025-01-01T00:00:00Z"),
    time_max: str | None = Query(None, description="RFC3339, e.g. 2025-12-31T23:59:59Z"),
    max_results: int = Query(50, ge=1, le=250),
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    try:
        events = gcal.list_events(user_id, time_min, time_max, max_results)
        return {"events": events}
    except ValueError:
        return {"events": []}
    except Exception as e:
        raise _gcal_error(e)

@router.post("/events", status_code=201)
def create_event(
    body: CalendarEventBody,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return gcal.create_event(user_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise _gcal_error(e)

@router.put("/events/{event_id}")
def update_event(
    event_id: str,
    body: CalendarEventBody,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return gcal.update_event(user_id, event_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise _gcal_error(e)
class PatchEventBody(BaseModel):
    summary: str | None = None
    description: str | None = None
    location: str | None = None
    start: EventDateTime | None = None
    end: EventDateTime | None = None

@router.patch("/events/{event_id}")
def patch_event(
    event_id: str,
    body: PatchEventBody,
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    try:
        return gcal.patch_event(user_id, event_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise _gcal_error(e)

@router.delete("/events/{event_id}")
def delete_event(
    event_id: str,
    user_id: int = Depends(get_authenticated_user_id),
) -> None:
    try:
        gcal.delete_event(user_id, event_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise _gcal_error(e)
