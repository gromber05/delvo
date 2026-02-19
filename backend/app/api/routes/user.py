from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.user import UserCreate, UserOut
from app.services.service_task import *

router = APIRouter(prefix="/users", tags=["users"])

@router.put("/{user_id}")
def update_user(user_id, user: str):
    return {"userid": user_id, "username": user}

@router.get("/{user_id}")
def get_user(user_id: int, q: str = None):
    return {"username" : user_id, "q": q}

@router.post("/{user_id}")
def create_user(user_id, username: str):
    return {"userid": user_id, "username": username}

@router.delete("/{user_id}")
def delete_user(user_id):
    return {"userid": user_id, "status": "deleted"}

