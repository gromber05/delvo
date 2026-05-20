from __future__ import annotations

import os
import time
from contextlib import contextmanager
from typing import Generator

from psycopg import Connection, OperationalError, connect
from psycopg.rows import dict_row


def _env(name: str, *, legacy: str | None = None, default: str) -> str:
    if legacy:
        return os.getenv(name, os.getenv(legacy, default))
    return os.getenv(name, default)


def _db_config() -> dict[str, str | int | bool]:
    """
    Función para obtener la configuración de las conexiones de la abse de datos.
    """
    return {
        "host": _env("POSTGRES_HOST", legacy="MARIADB_HOST", default="postgres"),
        "port": int(_env("POSTGRES_PORT", legacy="MARIADB_PORT", default="5432")),
        "user": _env("POSTGRES_USER", legacy="MARIADB_USER", default="delvo"),
        "password": _env("POSTGRES_PASSWORD", legacy="MARIADB_PASSWORD", default="delvo_password"),
        "dbname": _env("POSTGRES_DATABASE", legacy="MARIADB_DATABASE", default="delvo"),
        "autocommit": False,
    }


def _should_try_localhost_fallback(error: OperationalError) -> bool:
    message = str(error).lower()
    return any(
        token in message
        for token in [
            "could not translate host name",
            "name or service not known",
            "nodename nor servname provided",
            "temporary failure in name resolution",
            "no se conoce",
        ]
    )


def get_connection() -> Connection:
    config = _db_config()
    max_attempts = int(_env("POSTGRES_CONNECT_RETRIES", default="12"))
    retry_delay_seconds = float(_env("POSTGRES_CONNECT_RETRY_DELAY", default="1.0"))
    last_error: OperationalError | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return connect(**config)
        except OperationalError as primary_error:
            last_error = primary_error
            
            if str(config.get("host")) == "postgres" and _should_try_localhost_fallback(primary_error):
                fallback_config = {**config, "host": _env("POSTGRES_FALLBACK_HOST", default="localhost")}
                try:
                    return connect(**fallback_config)
                except OperationalError as fallback_error:
                    last_error = fallback_error

            if attempt < max_attempts:
                time.sleep(retry_delay_seconds)

    assert last_error is not None
    raise last_error


@contextmanager
def get_db_cursor(
    *,
    dictionary: bool = False,
) -> Generator[tuple[Connection, object], None, None]:
    connection = get_connection()
    if dictionary:
        cursor = connection.cursor(row_factory=dict_row)
    else:
        cursor = connection.cursor()
    try:
        yield connection, cursor
    finally:
        cursor.close()
        connection.close()
