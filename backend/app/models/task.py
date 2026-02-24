from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy import *
from sqlalchemy.orm import declarative_base, relationship

from app.db.base import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(String(1000))
    createdAt = Column(DateTime)
    ownerId = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="tasks")
