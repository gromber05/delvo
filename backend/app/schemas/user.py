from pydantic import BaseModel
from typing import List
from app.schemas.task import TaskOut

class UserCreate(BaseModel):
    name: str

class UserOut(BaseModel):
    id: int
    name: str
    tasks: List[TaskOut] = []

    model_config = {"from_attributes": True}