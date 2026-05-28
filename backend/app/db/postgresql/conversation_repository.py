from __future__ import annotations
import datetime as dt
from typing import Any
from sqlalchemy import func, literal_column
from app.db.models import Conversation, Message, User, _to_dict, get_session

def create_conversation(*, user_id: int, title: str) -> dict[str, Any]:
    with get_session() as session:
        conv = Conversation(user_id=user_id, title=title[:255])
        session.add(conv)
        session.flush()
        result = _to_dict(conv)
    return result

def list_conversations(*, user_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(
                Conversation,
                func.count(Message.id).label("message_count"),
            )
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .filter(Conversation.user_id == user_id)
            .group_by(Conversation.id)
            .order_by(Conversation.updated_at.desc())
            .limit(100)
            .all()
        )
        result = []
        for conv, message_count in rows:
            d = _to_dict(conv)
            d["message_count"] = message_count
            result.append(d)
    return result

def get_conversation(*, conversation_id: int, user_id: int) -> dict[str, Any] | None:
    with get_session() as session:
        row = (
            session.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .first()
        )
        return _to_dict(row) if row else None

def delete_conversation(*, conversation_id: int, user_id: int) -> bool:
    with get_session() as session:
        row = (
            session.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .first()
        )
        if not row:
            return False
        session.delete(row)
    return True

def touch_conversation(*, conversation_id: int) -> None:
    with get_session() as session:
        row = session.query(Conversation).filter(Conversation.id == conversation_id).first()
        if row:
            row.updated_at = func.now()

def add_message(
    *,
    conversation_id: int,
    role: str,
    content: str,
    intent: str | None = None,
    sentiment: str | None = None,
) -> dict[str, Any]:
    with get_session() as session:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            intent=intent,
            sentiment=sentiment,
        )
        session.add(msg)
        session.flush()
        result = _to_dict(msg)
    return result

def update_message_sentiment(*, message_id: int, sentiment: str) -> None:
    with get_session() as session:
        msg = session.query(Message).filter(Message.id == message_id).first()
        if msg:
            msg.sentiment = sentiment

def list_messages(*, conversation_id: int) -> list[dict[str, Any]]:
    with get_session() as session:
        rows = (
            session.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )
        return [_to_dict(row) for row in rows]

def get_admin_stats() -> dict[str, Any]:
    with get_session() as session:
        total_conversations = session.query(func.count(Conversation.id)).scalar() or 0

        total_messages = (
            session.query(func.count(Message.id))
            .filter(Message.role == "user")
            .scalar()
            or 0
        )

        total_users = session.query(func.count(User.id)).scalar() or 0

        intent_rows = (
            session.query(Message.intent, func.count(Message.id).label("count"))
            .filter(
                Message.role == "assistant",
                Message.intent.isnot(None),
                Message.intent != "query",
            )
            .group_by(Message.intent)
            .order_by(literal_column("count").desc())
            .limit(10)
            .all()
        )
        intent_distribution = [{"intent": r.intent, "count": r.count} for r in intent_rows]

        sentiment_rows = (
            session.query(Message.sentiment, func.count(Message.id).label("count"))
            .filter(Message.role == "user", Message.sentiment.isnot(None))
            .group_by(Message.sentiment)
            .order_by(literal_column("count").desc())
            .all()
        )
        sentiment_distribution = [{"sentiment": r.sentiment, "count": r.count} for r in sentiment_rows]

        cutoff = dt.datetime.utcnow() - dt.timedelta(days=14)
        daily_rows = (
            session.query(
                func.date(Message.created_at).label("day"),
                func.count(Message.id).label("messages"),
            )
            .filter(Message.role == "user", Message.created_at >= cutoff)
            .group_by(func.date(Message.created_at))
            .order_by(func.date(Message.created_at).asc())
            .all()
        )
        daily_activity = [{"day": str(r.day), "messages": r.messages} for r in daily_rows]

        top_user_rows = (
            session.query(
                User.name,
                User.email,
                func.count(Conversation.id).label("conversations"),
            )
            .outerjoin(Conversation, Conversation.user_id == User.id)
            .group_by(User.id, User.name, User.email)
            .order_by(literal_column("conversations").desc())
            .limit(10)
            .all()
        )
        top_users = [{"name": r.name, "email": r.email, "conversations": r.conversations} for r in top_user_rows]

    return {
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "intent_distribution": intent_distribution,
        "sentiment_distribution": sentiment_distribution,
        "daily_activity": daily_activity,
        "top_users": top_users,
    }
