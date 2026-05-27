from __future__ import annotations

from datetime import date

import pytest

from app.db.models import Conversation, Event, Meeting, Message, Note, Task, User

class TestUserModel:
    def _user(self, **kwargs) -> User:
        defaults = dict(id=1, email="user@test.io", role="user")
        defaults.update(kwargs)
        return User(**defaults)

    def test_repr_contains_email(self):
        u = self._user()
        assert "user@test.io" in repr(u)

    def test_is_admin_false_for_user(self):
        u = self._user(role="user")
        assert u.is_admin is False

    def test_is_admin_true_for_admin(self):
        u = self._user(role="admin")
        assert u.is_admin is True

    def test_has_google_false_without_email(self):
        u = self._user(google_email=None)
        assert u.has_google is False

    def test_has_google_true_with_email(self):
        u = self._user(google_email="user@gmail.com")
        assert u.has_google is True


class TestTaskModel:
    def _task(self, **kwargs) -> Task:
        defaults = dict(
            id=1, user_id=1, title="Tarea de prueba",
            priority="medium", status="pending",
        )
        defaults.update(kwargs)
        return Task(**defaults)

    def test_repr_contains_title(self):
        t = self._task()
        assert "Tarea de prueba" in repr(t)

    def test_is_done_false_when_pending(self):
        t = self._task(status="pending")
        assert t.is_done is False

    def test_is_done_true_when_done(self):
        t = self._task(status="done")
        assert t.is_done is True

    def test_is_pending_true_when_pending(self):
        t = self._task(status="pending")
        assert t.is_pending is True

    def test_is_pending_false_when_done(self):
        t = self._task(status="done")
        assert t.is_pending is False

    def test_is_overdue_false_without_due_date(self):
        t = self._task(due_date=None, status="pending")
        assert t.is_overdue is False

    def test_is_overdue_false_when_done(self):
        t = self._task(due_date=date(2000, 1, 1), status="done")
        assert t.is_overdue is False

    def test_is_overdue_true_for_past_date(self):
        t = self._task(due_date=date(2000, 1, 1), status="pending")
        assert t.is_overdue is True

    def test_is_overdue_false_for_future_date(self):
        t = self._task(due_date=date(9999, 12, 31), status="pending")
        assert t.is_overdue is False

    def test_priority_level_high(self):
        t = self._task(priority="high")
        assert t.priority_level == 3

    def test_priority_level_medium(self):
        t = self._task(priority="medium")
        assert t.priority_level == 2

    def test_priority_level_low(self):
        t = self._task(priority="low")
        assert t.priority_level == 1

    def test_priority_level_unknown_defaults_to_2(self):
        t = self._task(priority="ultra")
        assert t.priority_level == 2

class TestEventModel:
    def _event(self, **kwargs) -> Event:
        defaults = dict(
            id=1, user_id=1, title="Reunión kick-off",
            event_date="2025-06-01", event_type="meeting",
        )
        defaults.update(kwargs)
        return Event(**defaults)

    def test_repr_contains_title(self):
        e = self._event()
        assert "Reunión kick-off" in repr(e)

    def test_is_synced_false_without_gcal_id(self):
        e = self._event(gcal_event_id=None)
        assert e.is_synced_with_gcal is False

    def test_is_synced_true_with_gcal_id(self):
        e = self._event(gcal_event_id="gcal_abc123")
        assert e.is_synced_with_gcal is True


class TestMeetingModel:
    def _meeting(self, **kwargs) -> Meeting:
        defaults = dict(
            id=1, user_id=1, title="Sprint Planning",
            meeting_date="2025-06-02", meeting_time="10:00",
            status="scheduled",
        )
        defaults.update(kwargs)
        return Meeting(**defaults)

    def test_repr_contains_title(self):
        m = self._meeting()
        assert "Sprint Planning" in repr(m)

    def test_is_scheduled_true(self):
        m = self._meeting(status="scheduled")
        assert m.is_scheduled is True

    def test_is_scheduled_false_when_cancelled(self):
        m = self._meeting(status="cancelled")
        assert m.is_scheduled is False

    def test_is_cancelled_true(self):
        m = self._meeting(status="cancelled")
        assert m.is_cancelled is True

    def test_is_cancelled_false_when_scheduled(self):
        m = self._meeting(status="scheduled")
        assert m.is_cancelled is False

    def test_duration_hours_none_when_not_set(self):
        m = self._meeting(duration_minutes=None)
        assert m.duration_hours is None

    def test_duration_hours_correct(self):
        m = self._meeting(duration_minutes=90)
        assert m.duration_hours == pytest.approx(1.5)

    def test_duration_hours_zero(self):
        m = self._meeting(duration_minutes=0)
        assert m.duration_hours == 0.0


# ---------------------------------------------------------------------------
# Note
# ---------------------------------------------------------------------------

class TestNoteModel:

    def _note(self, **kwargs) -> Note:
        defaults = dict(id=1, user_id=1, title="Nota de prueba", status="active")
        defaults.update(kwargs)
        return Note(**defaults)

    def test_repr_contains_title(self):
        n = self._note()
        assert "Nota de prueba" in repr(n)

    def test_is_active_true(self):
        n = self._note(status="active")
        assert n.is_active is True

    def test_is_active_false_when_archived(self):
        n = self._note(status="archived")
        assert n.is_active is False

    def test_is_archived_true(self):
        n = self._note(status="archived")
        assert n.is_archived is True

    def test_is_archived_false_when_active(self):
        n = self._note(status="active")
        assert n.is_archived is False

    def test_preview_empty_without_content(self):
        n = self._note(content=None)
        assert n.preview == ""

    def test_preview_full_when_short(self):
        n = self._note(content="Texto corto")
        assert n.preview == "Texto corto"

    def test_preview_truncated_when_long(self):
        long_content = "x" * 200
        n = self._note(content=long_content)
        assert n.preview.endswith("…")
        # 100 chars + 1 ellipsis = 101 chars but as a single unicode char
        assert len(n.preview) == 101

    def test_preview_exactly_100_chars_not_truncated(self):
        content = "a" * 100
        n = self._note(content=content)
        assert n.preview == content
        assert "…" not in n.preview


# ---------------------------------------------------------------------------
# Conversation
# ---------------------------------------------------------------------------

class TestConversationModel:

    def _conversation(self, messages=None, **kwargs) -> Conversation:
        defaults = dict(id=1, user_id=1, title="Conversación test")
        defaults.update(kwargs)
        c = Conversation(**defaults)
        c.messages = messages or []
        return c

    def test_repr_contains_title(self):
        c = self._conversation()
        assert "Conversación test" in repr(c)

    def test_message_count_zero_when_empty(self):
        c = self._conversation()
        assert c.message_count == 0

    def test_message_count_correct(self):
        msgs = [
            Message(id=1, conversation_id=1, role="user", content="Hola"),
            Message(id=2, conversation_id=1, role="assistant", content="Hola!"),
        ]
        c = self._conversation(messages=msgs)
        assert c.message_count == 2

    def test_last_message_none_when_empty(self):
        c = self._conversation()
        assert c.last_message is None

    def test_last_message_returns_last(self):
        msg1 = Message(id=1, conversation_id=1, role="user", content="Primero")
        msg2 = Message(id=2, conversation_id=1, role="assistant", content="Segundo")
        c = self._conversation(messages=[msg1, msg2])
        assert c.last_message is msg2


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class TestMessageModel:

    def _message(self, **kwargs) -> Message:
        defaults = dict(id=1, conversation_id=1, role="user", content="Test")
        defaults.update(kwargs)
        return Message(**defaults)

    def test_repr_contains_role(self):
        m = self._message(role="assistant")
        assert "assistant" in repr(m)

    def test_is_from_user_true(self):
        m = self._message(role="user")
        assert m.is_from_user is True

    def test_is_from_user_false_for_assistant(self):
        m = self._message(role="assistant")
        assert m.is_from_user is False

    def test_is_from_assistant_true(self):
        m = self._message(role="assistant")
        assert m.is_from_assistant is True

    def test_is_from_assistant_false_for_user(self):
        m = self._message(role="user")
        assert m.is_from_assistant is False

    def test_is_positive_true(self):
        m = self._message(sentiment="positive")
        assert m.is_positive is True

    def test_is_positive_false_for_negative(self):
        m = self._message(sentiment="negative")
        assert m.is_positive is False

    def test_is_positive_false_for_neutral(self):
        m = self._message(sentiment="neutral")
        assert m.is_positive is False
