from __future__ import annotations

import pytest
from pydantic import ValidationError

class TestChatRequest:

    def test_valid_minimal(self):
        from app.api.v1.endpoints.assistant.schemas import ChatRequest
        req = ChatRequest(message="Hola")
        assert req.message == "Hola"
        assert req.use_rag is True
        assert req.history == []
        assert req.conversation_id is None

    def test_empty_message_fails(self):
        from app.api.v1.endpoints.assistant.schemas import ChatRequest
        with pytest.raises(ValidationError):
            ChatRequest(message="")

    def test_with_conversation_id(self):
        from app.api.v1.endpoints.assistant.schemas import ChatRequest
        req = ChatRequest(message="Hola", conversation_id=42)
        assert req.conversation_id == 42

    def test_with_history(self):
        from app.api.v1.endpoints.assistant.schemas import ChatRequest
        history = [{"role": "user", "content": "test"}]
        req = ChatRequest(message="Continúa", history=history)
        assert req.history == history

    def test_use_rag_false(self):
        from app.api.v1.endpoints.assistant.schemas import ChatRequest
        req = ChatRequest(message="Hola", use_rag=False)
        assert req.use_rag is False


class TestChatResponse:

    def test_valid_response(self):
        from app.api.v1.endpoints.assistant.schemas import ChatResponse
        resp = ChatResponse(
            intent="general",
            data={},
            message="Respuesta",
            context_used=[],
        )
        assert resp.intent == "general"
        assert resp.conversation_id is None

    def test_response_with_conversation_id(self):
        from app.api.v1.endpoints.assistant.schemas import ChatResponse
        resp = ChatResponse(
            intent="create_task",
            data={"id": 1},
            message="Tarea creada",
            context_used=["tasks"],
            conversation_id=5,
        )
        assert resp.conversation_id == 5


# ---------------------------------------------------------------------------
# Auth schemas (RegisterRequest, LoginRequest)
# ---------------------------------------------------------------------------

class TestRegisterRequest:

    def test_valid_register(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        req = RegisterRequest(email="nuevo@test.io", password="password123")
        assert req.email == "nuevo@test.io"

    def test_email_too_short_fails(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b", password="password123")

    def test_password_too_short_fails(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="user@test.io", password="short")

    def test_name_optional(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        req = RegisterRequest(email="user@test.io", password="password123")
        assert req.name is None

    def test_name_provided(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        req = RegisterRequest(name="Ana", email="ana@test.io", password="password123")
        assert req.name == "Ana"

    def test_password_max_length(self):
        from app.api.v1.endpoints.auth import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="u@test.io", password="x" * 129)


class TestLoginRequest:

    def test_valid_login(self):
        from app.api.v1.endpoints.auth import LoginRequest
        req = LoginRequest(email="user@test.io", password="clave")
        assert req.email == "user@test.io"

    def test_empty_password_fails(self):
        from app.api.v1.endpoints.auth import LoginRequest
        with pytest.raises(ValidationError):
            LoginRequest(email="user@test.io", password="")


# ---------------------------------------------------------------------------
# Planner schemas (TaskCreateRequest)
# ---------------------------------------------------------------------------

class TestTaskCreateRequest:

    def test_valid_minimal_task(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        req = TaskCreateRequest(title="Estudiar Python")
        assert req.title == "Estudiar Python"
        assert req.priority == "medium"
        assert req.status == "pending"

    def test_empty_title_fails(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        with pytest.raises(ValidationError):
            TaskCreateRequest(title="")

    def test_invalid_priority_fails(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        with pytest.raises(ValidationError):
            TaskCreateRequest(title="Test", priority="ultra")

    def test_valid_priorities(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        for p in ("low", "medium", "high"):
            req = TaskCreateRequest(title="T", priority=p)
            assert req.priority == p

    def test_valid_statuses(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        for s in ("pending", "done"):
            req = TaskCreateRequest(title="T", status=s)
            assert req.status == s

    def test_invalid_status_fails(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        with pytest.raises(ValidationError):
            TaskCreateRequest(title="T", status="in_progress")

    def test_optional_fields(self):
        from app.api.v1.endpoints.planner import TaskCreateRequest
        req = TaskCreateRequest(
            title="Mi tarea",
            description="Descripción larga",
            due_date="2025-12-31",
            due_time="09:00",
        )
        assert req.due_date == "2025-12-31"
        assert req.due_time == "09:00"
