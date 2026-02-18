from fastapi import FastAPI
from db.session import engine
from db.models import Base

app = FastAPI(title = "Delvo API")
#  Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"ok": True}

