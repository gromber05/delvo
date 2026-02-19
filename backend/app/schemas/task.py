from pydantic import BaseModel
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: str
    createdAt: datetime
    ownerId: int

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    createdAt: datetime
    ownerId: int

    model_config = {"from_attributes": True}