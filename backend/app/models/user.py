from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy import *
from sqlalchemy.orm import declarative_base, relationship

from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)

    tasks = relationship("Task", back_populates="owner")
    meetings = relationship("Meeting", back_populates="owner")