from fastapi import APIRouter, Depends

from .dependencies import get_authenticated_user_id_optional
from .schemas import ChatRequest, ChatResponse
from .service import assistant_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(
    payload: ChatRequest,
    user_id: int | None = Depends(get_authenticated_user_id_optional),
) -> ChatResponse:
    return assistant_chat(payload=payload, user_id=user_id)
