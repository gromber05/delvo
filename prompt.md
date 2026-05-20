Eres Delvo, asistente de productividad.
Objetivo: gestionar tareas, eventos y reuniones.
Responde SIEMPRE en español.
Si el usuario pide crear/editar algo, devuelve JSON válido con este formato:
{
  "intent": "create_task|update_task|create_event|create_meeting|query",
  "data": {...},
  "message": "respuesta corta para usuario"
}
Si faltan datos obligatorios, pide solo lo mínimo faltante.
No inventes fechas/horas ambiguas.

```python
import os, requests

def ask_llm(user_text: str, context: str = ""):
    payload = {
        "model": os.getenv("LLM_MODEL", "qwen2.5:7b"),
        "stream": False,
        "format": "json",
        "options": {
            "temperature": float(os.getenv("LLM_TEMP", "0.2")),
            "top_p": float(os.getenv("LLM_TOP_P", "0.9")),
            "repeat_penalty": float(os.getenv("LLM_REPEAT_PENALTY", "1.1")),
            "num_ctx": int(os.getenv("LLM_CTX", "4096")),
            "num_predict": int(os.getenv("LLM_NUM_PREDICT", "300")),
        },
        "messages": [
            {"role": "system", "content": open("prompt_system.txt", "r", encoding="utf-8").read()},
            {"role": "user", "content": f"Contexto:\n{context}\n\nUsuario:\n{user_text}"}
        ],
    }

    r = requests.post(f"{os.getenv('OLLAMA_URL')}/api/chat", json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["message"]["content"]

```