from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request as _urllib
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt as _jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel

from app.api.v1.endpoints.auth import get_authenticated_user_id
from app.db.postgresql.user_repository import update_google_tokens
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


# ── OAuth helpers ─────────────────────────────────────────────────────────────

def _fail_redirect(platform: str) -> RedirectResponse:
    if platform == "web":
        return RedirectResponse("https://delvo.gromber05.dev/es/settings?google=error", status_code=302)
    return RedirectResponse("delvo://oauth-callback?status=error", status_code=302)


@router.get("/connect")
def google_calendar_connect(
    platform: str = "mobile",
    user_id: int = Depends(get_authenticated_user_id),
) -> dict[str, Any]:
    """Returns a Google OAuth URL. Client opens it in a browser."""
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
    """Google OAuth callback — exchanges code, saves tokens, redirects back."""
    if error or not code or not state:
        return _fail_redirect("mobile")

    try:
        state_data = _jwt.decode(state, _OAUTH_SECRET, algorithms=["HS256"])
        user_id: int = int(state_data["uid"])
        platform: str = state_data.get("platform", "mobile")
    except Exception:
        return _fail_redirect("mobile")

    # Exchange code for tokens
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

    # Get email from userinfo
    google_email: str | None = None
    try:
        req = _urllib.Request(  # type: ignore[assignment]
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

    if platform == "web":
        return RedirectResponse("https://delvo.gromber05.dev/es/settings?google=ok", status_code=302)

    email_param = f"&email={urllib.parse.quote(google_email)}" if google_email else ""
    return RedirectResponse(f"delvo://oauth-callback?status=ok{email_param}", status_code=302)


# ── Calendar CRUD ─────────────────────────────────────────────────────────────

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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
