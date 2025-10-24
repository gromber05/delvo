# 📱 **Delvo** — AI-Translated Messaging App (Monorepo)

**Delvo** is a real-time messaging application where every message is automatically translated by AI into the recipient’s preferred language. This monorepo contains the **Backend**, the **Android native client**, and the **Web client**.

---

## 📦 Monorepo Structure

```
/
├── backend/         # REST + WebSocket + AI translation orchestration
├── mobile/     # Native Android app (Kotlin + Jetpack Compose)
└── web/             # Web client (Angular/React/Vue — TBD)
```

---

## ✨ Main Features

* 🔄 Automatic AI translation for all messages
* 🧠 Automatic language detection
* 🌍 Per-chat preferred language settings
* 🧾 Toggle: show original + translated or translated only
* 🚨 Content moderation (toxicity / safety)
* 🔐 Optional E2E encryption modes
* 🧩 Swappable AI providers (OpenAI, Azure, DeepL, Mock)
* ⚡ Caching + retries for failed translations
* 📬 Real-time WebSockets + Push notifications

---

## 🧱 Architecture Overview

```
Android / Web Client
   │
   ├── Auth (JWT/OAuth2)
   ├── HTTP API (history, settings, chats)
   └── WebSocket (real-time events)
          │
          ▼
         Delvo Backend
   ├── Message Service
   ├── Translation Orchestrator
   │      └── AI Provider (OpenAI/Azure/DeepL/Mock)
   ├── Moderation Layer
   ├── Notifications
   └── PostgreSQL + Redis
```

---

## 🧰 Tech Stack (proposed)

| Layer    | Technology                                                          |
| -------- | ------------------------------------------------------------------- |
| Backend  | Kotlin (Spring/Ktor), PostgreSQL, Redis, Docker                     |
| Android  | Kotlin + Jetpack Compose                                            |
| Web      | Angular                                                             |
| AI Layer | OpenAI / Azure / DeepL / Mock                                       |

---

## 🚀 Getting Started — Backend

### 1) Create `.env`

```
PORT=changeme
DATABASE_URL=changeme
REDIS_URL=changeme

TRANSLATION_PROVIDER=changeme
OPENAI_API_KEY=changeme
OPENAI_MODEL=changeme

JWT_SECRET=changeme
```

### 2) Run DB & Redis

```bash
docker compose up -d
```

### 3) Run backend

```bash
cd backend
npm install         # or pnpm/yarn
npm run migrate
npm run dev
```

---

## 🌐 Example — Send Message

```http
POST /api/v1/messages
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "chatId": "c123",
  "textOriginal": "¿Cómo estás?"
}
```

**Response**

```json
{
  "id": "m789",
  "chatId": "c123",
  "textOriginal": "¿Cómo estás?",
  "textTranslated": "How are you?",
  "langOriginal": "es",
  "langTarget": "en",
  "createdAt": "2025-01-01T12:00:00Z"
}
```

---

## 🔐 Security Notes

* Optional **client-side E2E translation** (server never sees plaintext)
* GDPR: right to export/delete personal data
* Rate limiting & abuse protection

---

## 🧭 Roadmap (short)

* [ ] Switchable provider: DeepL & Azure
* [ ] Voice messages with ASR + translation
* [ ] Group chats with per-member language
* [ ] Local caching on clients (offline mode)

---

## 🤝 Contributing

1. Fork & branch `feat/<name>`
2. Add tests & docs
3. Open PR with context and sample payloads

---

## 📄 License

MIT © 2025 — Delvo