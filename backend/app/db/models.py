from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import date, datetime
from typing import Any, Generator, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)


def get_database_url() -> str:
    """Builds the connection URL from environment variables."""
    host     = os.getenv("POSTGRES_HOST",     "postgres")
    port     = os.getenv("POSTGRES_PORT",     "5432")
    user     = os.getenv("POSTGRES_USER",     "delvo")
    password = os.getenv("POSTGRES_PASSWORD", "delvo_password")
    database = os.getenv("POSTGRES_DATABASE", "delvo")
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{database}"


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True)
    return _engine


# Legacy helpers kept for any code that still imports them directly
def create_orm_engine(url: str | None = None, **kwargs):
    return create_engine(url or get_database_url(), **kwargs)


def get_orm_session(engine=None) -> Session:
    if engine is None:
        engine = get_engine()
    return Session(engine)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Context manager that yields a SQLAlchemy Session.

    Commits on success, rolls back on error.
    expire_on_commit=False keeps objects accessible after commit.
    """
    engine = get_engine()
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    session: Session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _to_dict(obj) -> dict[str, Any]:
    """Convert an ORM mapped object to a plain dict using __table__.columns."""
    return {col.name: getattr(obj, col.name) for col in obj.__table__.columns}


class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id:                   Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    name:                 Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    email:                Mapped[str]           = mapped_column(String(190), unique=True, nullable=False, index=True)
    password_hash:        Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_photo_base64: Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    role:                 Mapped[str]           = mapped_column(String(20),  nullable=False, default="user")
    google_email:         Mapped[Optional[str]] = mapped_column(String(190), nullable=True)
    google_access_token:  Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    google_refresh_token: Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    google_token_expiry:  Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    expo_push_token:      Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    gcal_channel_id:      Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gcal_watch_expiry:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    created_at:           Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:           Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tasks:         Mapped[List["Task"]]         = relationship("Task",         back_populates="user", cascade="all, delete-orphan")
    events:        Mapped[List["Event"]]        = relationship("Event",        back_populates="user", cascade="all, delete-orphan")
    meetings:      Mapped[List["Meeting"]]      = relationship("Meeting",      back_populates="user", cascade="all, delete-orphan")
    notes:         Mapped[List["Note"]]         = relationship("Note",         back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def has_google(self) -> bool:
        return self.google_email is not None


class Task(Base):
    __tablename__ = "tasks"

    id:          Mapped[int]                     = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:     Mapped[int]                     = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:       Mapped[str]                     = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]]           = mapped_column(Text,        nullable=True)
    due_date:    Mapped[Optional[date]]          = mapped_column(Date,        nullable=True)
    due_time:    Mapped[Optional[datetime]]      = mapped_column(Time,        nullable=True)
    priority:    Mapped[str]                     = mapped_column(String(20),  nullable=False, default="medium")
    status:      Mapped[str]                     = mapped_column(String(20),  nullable=False, default="pending")
    created_at:  Mapped[datetime]                = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:  Mapped[datetime]                = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="tasks")

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title!r} priority={self.priority!r} status={self.status!r}>"

    @property
    def is_done(self) -> bool:
        return self.status == "done"

    @property
    def is_pending(self) -> bool:
        return self.status == "pending"

    @property
    def is_overdue(self) -> bool:
        """True si la tarea tiene fecha pasada y no está completada."""
        if not self.due_date or self.is_done:
            return False
        today = date.today()
        due = self.due_date if isinstance(self.due_date, date) else date.fromisoformat(str(self.due_date))
        return due < today

    @property
    def priority_level(self) -> int:
        """Devuelve un entero para ordenar por prioridad: high=3, medium=2, low=1."""
        return {"high": 3, "medium": 2, "low": 1}.get(self.priority, 2)


class Event(Base):
    __tablename__ = "events"

    id:            Mapped[int]                  = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:       Mapped[int]                  = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:         Mapped[str]                  = mapped_column(String(255), nullable=False)
    description:   Mapped[Optional[str]]        = mapped_column(Text,        nullable=True)
    event_date:    Mapped[date]                 = mapped_column(Date,        nullable=False)
    event_time:    Mapped[Optional[datetime]]   = mapped_column(Time,        nullable=True)
    location:      Mapped[Optional[str]]        = mapped_column(String(255), nullable=True)
    event_type:    Mapped[str]                  = mapped_column(String(50),  nullable=False, default="general")
    gcal_event_id: Mapped[Optional[str]]        = mapped_column(String(255), nullable=True)
    created_at:    Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:    Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="events")

    def __repr__(self) -> str:
        return f"<Event id={self.id} title={self.title!r} date={self.event_date!r}>"

    @property
    def is_synced_with_gcal(self) -> bool:
        return self.gcal_event_id is not None


class Meeting(Base):
    __tablename__ = "meetings"

    id:               Mapped[int]                  = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:          Mapped[int]                  = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:            Mapped[str]                  = mapped_column(String(255), nullable=False)
    description:      Mapped[Optional[str]]        = mapped_column(Text,        nullable=True)
    meeting_date:     Mapped[date]                 = mapped_column(Date,        nullable=False)
    meeting_time:     Mapped[datetime]             = mapped_column(Time,        nullable=False)
    duration_minutes: Mapped[Optional[int]]        = mapped_column(Integer,     nullable=True)
    location:         Mapped[Optional[str]]        = mapped_column(String(255), nullable=True)
    status:           Mapped[str]                  = mapped_column(String(20),  nullable=False, default="scheduled")
    created_at:       Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:       Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user:         Mapped["User"]                    = relationship("User", back_populates="meetings")
    participants: Mapped[List["MeetingParticipant"]] = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingParticipant.created_at, MeetingParticipant.id",
    )

    def __repr__(self) -> str:
        return f"<Meeting id={self.id} title={self.title!r} date={self.meeting_date!r} status={self.status!r}>"

    @property
    def is_scheduled(self) -> bool:
        return self.status == "scheduled"

    @property
    def is_cancelled(self) -> bool:
        return self.status == "cancelled"

    @property
    def duration_hours(self) -> float | None:
        if self.duration_minutes is None:
            return None
        return self.duration_minutes / 60.0


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    __table_args__ = (UniqueConstraint("meeting_id", "participant_email", name="uq_meeting_participant_email"),)

    id:                Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id:        Mapped[int]            = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_name:  Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    participant_email: Mapped[str]            = mapped_column(String(255), nullable=False)
    created_at:        Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="participants")

    def __repr__(self) -> str:
        return f"<MeetingParticipant id={self.id} meeting_id={self.meeting_id} email={self.participant_email!r}>"


class Note(Base):
    """
    Nota rápida del usuario. Puede estar activa o archivada.
    """
    __tablename__ = "notes"

    id:         Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]           = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:      Mapped[str]           = mapped_column(String(255), nullable=False)
    content:    Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    status:     Mapped[str]           = mapped_column(String(20),  nullable=False, default="active")
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="notes")

    def __repr__(self) -> str:
        return f"<Note id={self.id} title={self.title!r} status={self.status!r}>"

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @property
    def is_archived(self) -> bool:
        return self.status == "archived"

    @property
    def preview(self) -> str:
        """Primeros 100 caracteres del contenido."""
        if not self.content:
            return ""
        return self.content[:100] + ("…" if len(self.content) > 100 else "")


class Conversation(Base):
    __tablename__ = "conversations"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title:      Mapped[str]      = mapped_column(String(255), nullable=False, default="Conversación")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user:     Mapped["User"]          = relationship("User", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} title={self.title!r}>"

    @property
    def message_count(self) -> int:
        return len(self.messages)

    @property
    def last_message(self) -> "Message | None":
        return self.messages[-1] if self.messages else None


class Message(Base):
    __tablename__ = "messages"

    id:              Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int]           = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role:            Mapped[str]           = mapped_column(String(20), nullable=False)
    content:         Mapped[str]           = mapped_column(Text,       nullable=False)
    intent:          Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sentiment:       Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at:      Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message id={self.id} role={self.role!r} intent={self.intent!r} sentiment={self.sentiment!r}>"

    @property
    def is_from_user(self) -> bool:
        return self.role == "user"

    @property
    def is_from_assistant(self) -> bool:
        return self.role == "assistant"

    @property
    def is_positive(self) -> bool:
        return self.sentiment == "positive"
