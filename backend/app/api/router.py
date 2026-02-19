from fastapi import APIRouter
from app.api.routes import user, task

routes_list = [user.router, task.router]

api_router = APIRouter()

for i in routes_list:
    api_router.include_router(i)
