from fastapi import FastAPI
from db.session import engine
from db.models import Base
from pydantic import BaseModel

app = FastAPI(title = "Delvo API")
#  Base.metadata.create_all(bind=engine)
class User(BaseModel):
    user_id: int
    username: str

@app.put("/users/{user_id}")
def create_user(user_id: int, user: User):
    return {"userid": user_id, "username": user.username}

@app.get("/health")
def health():
    return {"ok": True} 

@app.get("/users/{user_id}")
def get_user(user_id: int, q: str = None):
    return { "username" : user_id, "q": q}

