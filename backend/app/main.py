from fastapi import FastAPI
from app.db.session import engine
from app.db.base import Base
from pydantic import BaseModel
from app.api.router import api_router

app = FastAPI(title = "Delvo API")
app.include_router(api_router)

Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"ok": True}