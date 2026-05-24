from __future__ import annotations

from typing import Any

from app.db.postgresql.connector import get_db_cursor


def create_conversation(*, user_id: int, title: str) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO conversations (user_id, title)
            VALUES (%s, %s)
            RETURNING id, user_id, title, created_at, updated_at
            """,
            (user_id, title[:255]),
        )
        row = cursor.fetchone()
        connection.commit()
        return {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "created_at": row[3],
            "updated_at": row[4],
        }


def list_conversations(*, user_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT c.id, c.user_id, c.title, c.created_at, c.updated_at,
                   COUNT(m.id) AS message_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.user_id = %s
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            LIMIT 100
            """,
            (user_id,),
        )
        return [dict(r) for r in cursor.fetchall()]


def get_conversation(*, conversation_id: int, user_id: int) -> dict[str, Any] | None:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = %s AND user_id = %s",
            (conversation_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_conversation(*, conversation_id: int, user_id: int) -> bool:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "DELETE FROM conversations WHERE id = %s AND user_id = %s",
            (conversation_id, user_id),
        )
        affected = cursor.rowcount
        connection.commit()
        return affected > 0


def touch_conversation(*, conversation_id: int) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (conversation_id,),
        )
        connection.commit()


def add_message(
    *,
    conversation_id: int,
    role: str,
    content: str,
    intent: str | None = None,
    sentiment: str | None = None,
) -> dict[str, Any]:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO messages (conversation_id, role, content, intent, sentiment)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, conversation_id, role, content, intent, sentiment, created_at
            """,
            (conversation_id, role, content, intent, sentiment),
        )
        row = cursor.fetchone()
        connection.commit()
        return {
            "id": row[0],
            "conversation_id": row[1],
            "role": row[2],
            "content": row[3],
            "intent": row[4],
            "sentiment": row[5],
            "created_at": row[6],
        }


def update_message_sentiment(*, message_id: int, sentiment: str) -> None:
    with get_db_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE messages SET sentiment = %s WHERE id = %s",
            (sentiment, message_id),
        )
        connection.commit()


def list_messages(*, conversation_id: int) -> list[dict[str, Any]]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT id, conversation_id, role, content, intent, sentiment, created_at
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
            """,
            (conversation_id,),
        )
        return [dict(r) for r in cursor.fetchall()]


def get_admin_stats() -> dict[str, Any]:
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute("SELECT COUNT(*) AS total FROM conversations")
        total_conversations = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM messages WHERE role = 'user'")
        total_messages = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM users")
        total_users = cursor.fetchone()["total"]

        # Intent distribution
        cursor.execute(
            """
            SELECT intent, COUNT(*) AS count
            FROM messages
            WHERE role = 'assistant' AND intent IS NOT NULL AND intent != 'query'
            GROUP BY intent
            ORDER BY count DESC
            LIMIT 10
            """
        )
        intent_distribution = [dict(r) for r in cursor.fetchall()]

        # Sentiment distribution
        cursor.execute(
            """
            SELECT sentiment, COUNT(*) AS count
            FROM messages
            WHERE role = 'user' AND sentiment IS NOT NULL
            GROUP BY sentiment
            ORDER BY count DESC
            """
        )
        sentiment_distribution = [dict(r) for r in cursor.fetchall()]

        # Activity last 14 days
        cursor.execute(
            """
            SELECT DATE(created_at) AS day, COUNT(*) AS messages
            FROM messages
            WHERE role = 'user' AND created_at >= CURRENT_DATE - INTERVAL '14 days'
            GROUP BY day
            ORDER BY day ASC
            """
        )
        daily_activity = [{"day": str(r["day"]), "messages": r["messages"]} for r in cursor.fetchall()]

        # Users with most conversations
        cursor.execute(
            """
            SELECT u.name, u.email, COUNT(c.id) AS conversations
            FROM users u
            LEFT JOIN conversations c ON c.user_id = u.id
            GROUP BY u.id, u.name, u.email
            ORDER BY conversations DESC
            LIMIT 10
            """
        )
        top_users = [dict(r) for r in cursor.fetchall()]

        return {
            "total_users": total_users,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "intent_distribution": intent_distribution,
            "sentiment_distribution": sentiment_distribution,
            "daily_activity": daily_activity,
            "top_users": top_users,
        }
