from __future__ import annotations

import logging
from pathlib import Path

from app.db.postgresql.connector import get_db_cursor

logger = logging.getLogger(__name__)

_SQL_FILE = Path(__file__).parents[3] / "init.sql"


def init_db() -> None:
    sql = _SQL_FILE.read_text(encoding="utf-8")
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    with get_db_cursor() as (connection, cursor):
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
    logger.info("Base de datos inicializada (%d sentencias)", len(statements))
