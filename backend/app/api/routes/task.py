from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.task import *
from app.services.service_task import *

router = APIRouter(prefix="/task", tags=["tasks"])

@router.post("/{task_id}")
def create_task(task_id):
    return {"task_id" : task_id, "action": "created" }

@router.delete("/{task_id}")
def delete_task(task_id):
    return {"task_id": task_id, "action": "delete"}

@router.put("/{task_id}")
def update_task(task_id):
    return {"task_id": task_id, "action": "update"}

@router.get("/{task_id}")
def get_task(task_id):
    return {"task_id": task_id, "action": "read"}