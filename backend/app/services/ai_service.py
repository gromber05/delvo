"""Cliente de IA local usado por el asistente conversacional.

El servicio encapsula Ollama para chat estructurado en JSON y embeddings.
Tambien normaliza respuestas del modelo para que los endpoints trabajen con
un contrato estable aunque el proveedor devuelva formatos distintos.
"""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

class AIService:
    """Clase para invocar el LLM y el modelo de embeddings configurados."""

    def __init__(self) -> None:
        """Carga configuracion desde variables de entorno y rutas de prompts."""
        self.ollama_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        self.model = os.getenv("LLM_MODEL", "qwen2.5:7b")
        self.embed_model = os.getenv("EMBED_MODEL", "nomic-embed-text")
        self.temp = float(os.getenv("LLM_TEMP", "0.2"))
        self.top_p = float(os.getenv("LLM_TOP_P", "0.9"))
        self.repeat_penalty = float(os.getenv("LLM_REPEAT_PENALTY", "1.1"))
        self.num_ctx = int(os.getenv("LLM_CTX", "4096"))
        self.num_predict = int(os.getenv("LLM_NUM_PREDICT", "420"))

        root = Path(__file__).resolve().parents[2]
        self.prompt_path = Path(os.getenv("PROMPT_PATH", str(root / "prompt_system.txt")))
        self.prompt_path_en = Path(os.getenv("PROMPT_PATH_EN", str(root / "prompt_system_en.txt")))

    @staticmethod
    def _normalize_language(value: str | None) -> str:
        """Reduce codigos de idioma a los prompts soportados por Delvo."""
        raw = (value or "").strip().lower()
        if not raw:
            return "es"
        base = raw.split("-")[0]
        return "en" if base == "en" else "es"

    def _system_prompt(self, language: str | None = None) -> str:
        """Devuelve el prompt de sistema por idioma con fallback embebido."""
        normalized_language = self._normalize_language(language)
        selected_prompt_path = self.prompt_path_en if normalized_language == "en" else self.prompt_path

        if selected_prompt_path.exists():
            return selected_prompt_path.read_text(encoding="utf-8")

        if self.prompt_path.exists():
            return self.prompt_path.read_text(encoding="utf-8")

        if normalized_language == "en":
            return (
                "You are Delvo, a productivity assistant. "
                "Always respond in English and prioritize valid JSON."
            )

        return (
            "Eres Delvo, asistente de productividad. "
            "Responde siempre en espanol y prioriza JSON valido."
        )

    def _post_json(
        self, path: str, payload: Dict[str, Any], timeout: int, *, strict: bool = False
    ) -> Dict[str, Any]:
        """Envia JSON a Ollama y devuelve un dict, opcionalmente propagando errores."""
        body = json.dumps(payload).encode("utf-8")
        req = Request(
            url=f"{self.ollama_url}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            if strict:
                raise RuntimeError(f"ollama_request_failed: {exc}") from exc
            return {}

    def chat_json(
        self,
        user_text: str,
        context: str = "",
        history: Optional[List[Dict[str, str]]] = None,
        language: str | None = None,
    ) -> Dict[str, Any]:
        """Pide al LLM una respuesta JSON normalizada para el flujo de assistant."""
        messages: List[Dict[str, str]] = [{"role": "system", "content": self._system_prompt(language)}]

        if context.strip():
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "Contexto RAG (usar solo si aporta valor y no contradice al usuario):\n"
                        f"{context}"
                    ),
                }
            )

        for turn in history or []:
            role = str(turn.get("role", "")).strip().lower()
            content = str(turn.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_text})

        payload = {
            "model": self.model,
            "stream": False,
            "format": "json",
            "think": False,
            "options": {
                "temperature": self.temp,
                "top_p": self.top_p,
                "repeat_penalty": self.repeat_penalty,
                "num_ctx": self.num_ctx,
                "num_predict": self.num_predict,
            },
            "messages": messages,
        }

        response = self._post_json("/api/chat", payload, timeout=120, strict=True)
        raw = self._extract_model_text(response)

        parsed = self._parse_json_dict(raw)
        if parsed is not None:
            return self._normalize_model_json(parsed)

        return {
            "intent": "query",
            "data": {},
            "message": (
                raw.strip()
                or "No pude interpretar la respuesta del modelo. Intenta de nuevo en una frase corta."
            ),
        }

    @staticmethod
    def _normalize_model_json(parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Asegura que intent, data y message tengan tipos esperados."""
        intent = parsed.get("intent")
        data = parsed.get("data")
        message = parsed.get("message")

        safe_intent = intent if isinstance(intent, str) and intent.strip() else "query"
        safe_data = data if isinstance(data, dict) else {}
        safe_message = (
            message.strip()
            if isinstance(message, str) and message.strip()
            else "Entendido. ¿Me confirmas el dato que falta para ayudarte?"
        )

        return {
            "intent": safe_intent,
            "data": safe_data,
            "message": safe_message,
        }

    @staticmethod
    def _extract_model_text(response: Dict[str, Any]) -> str:
        """Extrae texto de respuesta compatible con varios formatos de API."""
        message = response.get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str):
                return content

        response_text = response.get("response")
        if isinstance(response_text, str):
            return response_text

        choices = response.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                msg = first.get("message")
                if isinstance(msg, dict):
                    content = msg.get("content")
                    if isinstance(content, str):
                        return content
                text = first.get("text")
                if isinstance(text, str):
                    return text

        return ""

    @staticmethod
    def _parse_json_dict(raw: Any) -> Optional[Dict[str, Any]]:
        """Recupera un objeto JSON incluso si el modelo lo envuelve en texto."""
        if not isinstance(raw, str):
            return None

        text = raw.strip()
        if not text:
            return None

        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            fenced = "\n".join(lines).strip()
            if fenced.lower().startswith("json"):
                fenced = fenced[4:].strip()
            try:
                parsed = json.loads(fenced)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

        decoder = json.JSONDecoder()
        for idx, char in enumerate(text):
            if char != "{":
                continue
            try:
                parsed, _ = decoder.raw_decode(text[idx:])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue

        return None

    def embed(self, text: str) -> Optional[List[float]]:
        """Genera un embedding para texto usando endpoints actuales o legacy."""
        payload_embed = {"model": self.embed_model, "input": text}
        data = self._post_json("/api/embed", payload_embed, timeout=60)
        embeddings = data.get("embeddings") or []
        if embeddings and isinstance(embeddings[0], list):
            return embeddings[0]

        payload_embeddings = {"model": self.embed_model, "prompt": text}
        data = self._post_json("/api/embeddings", payload_embeddings, timeout=60)
        if isinstance(data.get("embedding"), list):
            return data.get("embedding")

        return None


ai_service = AIService()
