import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_access_token
from app.db.postgresql.user_repository import get_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)

def get_authenticated_user_id_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int | None:
    if not credentials:
        return None

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Token de acceso invalido")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token de acceso invalido") from None

    raw_uid = payload.get("uid")
    if not isinstance(raw_uid, int):
        raise HTTPException(status_code=401, detail="Token de acceso invalido")

    if get_user_by_id(raw_uid) is None:
        raise HTTPException(status_code=401, detail="Token de acceso invalido")

    return raw_uid
