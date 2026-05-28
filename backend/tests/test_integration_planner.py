from __future__ import annotations

from unittest.mock import patch

import pytest

from app.core.security import create_access_token, hash_password

BASE = "/api/v1/planner"

def _token(uid: int = 1, email: str = "test@delvo.io") -> str:
    return create_access_token(subject=email, user_id=uid)

def _headers(uid: int = 1) -> dict:
    return {"Authorization": f"Bearer {_token(uid)}"}

def _mock_user(uid: int = 1) -> dict:
    return {
        "id": uid, "name": "Test", "email": "test@delvo.io",
        "password_hash": hash_password("pw"), "role": "user",
        "google_email": None, "profile_photo_base64": None,
        "created_at": None, "updated_at": None,
    }

def _mock_task(task_id: int = 1, user_id: int = 1) -> dict:
    return {
        "id": task_id, "user_id": user_id,
        "title": "Tarea de prueba", "description": None,
        "due_date": "2025-12-31", "due_time": None,
        "priority": "medium", "status": "pending",
        "created_at": None, "updated_at": None,
    }

def _mock_event(event_id: int = 1, user_id: int = 1) -> dict:
    return {
        "id": event_id, "user_id": user_id,
        "title": "Evento de prueba", "description": None,
        "event_date": "2025-06-01", "event_time": "10:00",
        "location": None, "event_type": "general",
        "gcal_event_id": None, "created_at": None, "updated_at": None,
    }

def _mock_meeting(meeting_id: int = 1, user_id: int = 1) -> dict:
    return {
        "id": meeting_id, "user_id": user_id,
        "title": "Reunión de prueba", "description": None,
        "meeting_date": "2025-06-02", "meeting_time": "11:00",
        "duration_minutes": 60, "location": None,
        "participants": [], "status": "scheduled",
        "created_at": None, "updated_at": None,
    }

def _mock_note(note_id: int = 1, user_id: int = 1) -> dict:
    return {
        "id": note_id, "user_id": user_id,
        "title": "Nota de prueba", "content": "Contenido de la nota",
        "status": "active", "created_at": None, "updated_at": None,
    }

class TestTasks:
    def test_list_tasks_requires_auth(self, client):
        resp = client.get(f"{BASE}/tasks")
        assert resp.status_code == 401

    def test_list_tasks_returns_items(self, client):
        tasks = [_mock_task(1), _mock_task(2)]
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.list_tasks", return_value=tasks),
        ):
            resp = client.get(f"{BASE}/tasks", headers=_headers())
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 2

    def test_create_task_success(self, client):
        task = _mock_task()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.create_task", return_value=task),
        ):
            resp = client.post(f"{BASE}/tasks", json={
                "title": "Tarea de prueba",
                "priority": "high",
                "due_date": "2025-12-31",
            }, headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["title"] == "Tarea de prueba"

    def test_create_task_empty_title_returns_422(self, client):
        with patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()):
            resp = client.post(f"{BASE}/tasks", json={"title": ""}, headers=_headers())
        assert resp.status_code == 422

    def test_get_task_success(self, client):
        task = _mock_task()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.get_task", return_value=task),
        ):
            resp = client.get(f"{BASE}/tasks/1", headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["id"] == 1

    def test_get_task_not_found_returns_404(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.get_task", return_value=None),
        ):
            resp = client.get(f"{BASE}/tasks/999", headers=_headers())
        assert resp.status_code == 404

    def test_update_task_success(self, client):
        updated = _mock_task()
        updated["status"] = "done"
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.update_task", return_value=updated),
        ):
            resp = client.put(f"{BASE}/tasks/1", json={
                "title": "Tarea de prueba",
                "status": "done",
                "priority": "medium",
            }, headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["status"] == "done"

    def test_delete_task_success(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.delete_task", return_value=True),
        ):
            resp = client.delete(f"{BASE}/tasks/1", headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_delete_task_not_found_returns_404(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.delete_task", return_value=False),
        ):
            resp = client.delete(f"{BASE}/tasks/999", headers=_headers())
        assert resp.status_code == 404

class TestEvents:
    def test_list_events_requires_auth(self, client):
        resp = client.get(f"{BASE}/events")
        assert resp.status_code == 401

    def test_list_events_returns_items(self, client):
        events = [_mock_event(1), _mock_event(2)]
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.list_events", return_value=events),
        ):
            resp = client.get(f"{BASE}/events", headers=_headers())
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 2

    def test_create_event_success(self, client):
        event = _mock_event()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.create_event", return_value=event),
        ):
            resp = client.post(f"{BASE}/events", json={
                "title": "Evento de prueba",
                "event_date": "2025-06-01",
            }, headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["title"] == "Evento de prueba"

    def test_create_event_missing_date_returns_422(self, client):
        with patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()):
            resp = client.post(f"{BASE}/events", json={"title": "Sin fecha"}, headers=_headers())
        assert resp.status_code == 422

    def test_get_event_not_found_returns_404(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.get_event", return_value=None),
        ):
            resp = client.get(f"{BASE}/events/999", headers=_headers())
        assert resp.status_code == 404

    def test_delete_event_success(self, client):
        event = _mock_event()  # gcal_event_id is None → no GCal deletion attempt
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.get_event", return_value=event),
            patch("app.api.v1.endpoints.planner.delete_event", return_value=True),
        ):
            resp = client.delete(f"{BASE}/events/1", headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

class TestMeetings:
    def test_list_meetings_requires_auth(self, client):
        resp = client.get(f"{BASE}/meetings")
        assert resp.status_code == 401

    def test_list_meetings_returns_items(self, client):
        meetings = [_mock_meeting(1), _mock_meeting(2)]
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.list_meetings", return_value=meetings),
        ):
            resp = client.get(f"{BASE}/meetings", headers=_headers())
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 2

    def test_create_meeting_success(self, client):
        meeting = _mock_meeting()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.create_meeting", return_value=meeting),
        ):
            resp = client.post(f"{BASE}/meetings", json={
                "title": "Reunión de prueba",
                "meeting_date": "2025-06-02",
                "meeting_time": "11:00",
            }, headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["title"] == "Reunión de prueba"

    def test_create_meeting_invalid_status_returns_422(self, client):
        with patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()):
            resp = client.post(f"{BASE}/meetings", json={
                "title": "Reunión",
                "meeting_date": "2025-06-02",
                "meeting_time": "11:00",
                "status": "invalid_status",
            }, headers=_headers())
        assert resp.status_code == 422

    def test_delete_meeting_not_found_returns_404(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.delete_meeting", return_value=False),
        ):
            resp = client.delete(f"{BASE}/meetings/999", headers=_headers())
        assert resp.status_code == 404

class TestNotes:
    def test_list_notes_requires_auth(self, client):
        resp = client.get(f"{BASE}/notes")
        assert resp.status_code == 401

    def test_list_notes_returns_items(self, client):
        notes = [_mock_note(1), _mock_note(2), _mock_note(3)]
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.list_notes", return_value=notes),
        ):
            resp = client.get(f"{BASE}/notes", headers=_headers())
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 3

    def test_create_note_success(self, client):
        note = _mock_note()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.create_note", return_value=note),
        ):
            resp = client.post(f"{BASE}/notes", json={
                "title": "Nota de prueba",
                "content": "Contenido de la nota",
            }, headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["title"] == "Nota de prueba"

    def test_create_note_invalid_status_returns_422(self, client):
        with patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()):
            resp = client.post(f"{BASE}/notes", json={
                "title": "Nota",
                "status": "deleted",
            }, headers=_headers())
        assert resp.status_code == 422

    def test_get_note_success(self, client):
        note = _mock_note()
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.get_note", return_value=note),
        ):
            resp = client.get(f"{BASE}/notes/1", headers=_headers())
        assert resp.status_code == 200
        assert resp.json()["item"]["id"] == 1

    def test_delete_note_success(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.delete_note", return_value=True),
        ):
            resp = client.delete(f"{BASE}/notes/1", headers=_headers())
        assert resp.status_code == 200

    def test_update_note_not_found_returns_404(self, client):
        with (
            patch("app.api.v1.endpoints.planner.get_user_by_id", return_value=_mock_user()),
            patch("app.api.v1.endpoints.planner.update_note", return_value=None),
        ):
            resp = client.put(f"{BASE}/notes/999", json={
                "title": "Actualizada",
                "status": "archived",
            }, headers=_headers())
        assert resp.status_code == 404
