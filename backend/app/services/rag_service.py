
from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List
from app.services.ai_service import ai_service

@dataclass
class Chunk:
    source: str
    text: str
    embedding: List[float]

class RAGService:

    def __init__(self) -> None:
        root = Path(__file__).resolve().parents[2]
        self.knowledge_dir = Path(os.getenv("RAG_KNOWLEDGE_DIR", str(root / "knowledge")))
        self.chunk_size = int(os.getenv("RAG_CHUNK_SIZE", "500"))
        self.chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP", "80"))
        self.top_k = int(os.getenv("RAG_TOP_K", "4"))
        self.score_threshold = float(os.getenv("RAG_SCORE_THRESHOLD", "0.35"))
        self.index: List[Chunk] = []

    def _chunk_text(self, text: str) -> List[str]:
        clean = " ".join(text.split())
        if not clean:
            return []

        chunks: List[str] = []
        start = 0
        step = max(1, self.chunk_size - self.chunk_overlap)
        while start < len(clean):
            end = start + self.chunk_size
            chunks.append(clean[start:end])
            start += step
        return chunks

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(y * y for y in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

    def rebuild_index(self) -> int:
        self.index = []
        if not self.knowledge_dir.exists():
            return 0

        files = list(self.knowledge_dir.rglob("*.md")) + list(self.knowledge_dir.rglob("*.txt"))
        for file_path in files:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            for chunk in self._chunk_text(text):
                emb = ai_service.embed(chunk)
                if emb:
                    self.index.append(Chunk(source=str(file_path), text=chunk, embedding=emb))
        return len(self.index)

    def retrieve(self, query: str) -> List[Chunk]:
        if not self.index:
            self.rebuild_index()
        if not self.index:
            return []

        q_emb = ai_service.embed(query)
        if not q_emb:
            return []

        scored = []
        for chunk in self.index:
            score = self._cosine(q_emb, chunk.embedding)
            if score >= self.score_threshold:
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[: self.top_k]]

rag_service = RAGService()
