# Diagramas UML — Delvo

## 1. Diagrama de Casos de Uso

```mermaid
flowchart LR
    subgraph Actores
        U(["👤 Usuario"])
        A(["🔑 Administrador"])
        G(["🌐 Google Calendar"])
        S(["🤖 Stella / LLM"])
    end

    subgraph Sistema Delvo
        direction TB

        subgraph Auth["Autenticación"]
            UC1([Registrarse])
            UC2([Iniciar sesión])
            UC3([Iniciar sesión con Google])
            UC4([Refrescar token])
            UC5([Cambiar contraseña])
            UC6([Eliminar cuenta])
        end

        subgraph Planificador["Planificador"]
            UC7([Gestionar Tareas])
            UC8([Gestionar Eventos])
            UC9([Gestionar Reuniones])
            UC10([Gestionar Notas])
        end

        subgraph Calendario["Calendario"]
            UC11([Ver calendario unificado])
            UC12([Sincronizar Google Calendar])
            UC13([Conectar/desconectar GCal])
        end

        subgraph Asistente["Asistente IA — Stella"]
            UC14([Chatear con Stella])
            UC15([Crear ítem por voz/texto])
            UC16([Consultar agenda])
            UC17([Transcribir audio])
        end

        subgraph Admin["Administración"]
            UC18([Ver usuarios])
            UC19([Gestionar sistema])
        end
    end

    U --> UC1
    U --> UC2
    U --> UC3
    U --> UC4
    U --> UC5
    U --> UC6
    U --> UC7
    U --> UC8
    U --> UC9
    U --> UC10
    U --> UC11
    U --> UC12
    U --> UC13
    U --> UC14
    U --> UC15
    U --> UC16
    U --> UC17

    A --> UC18
    A --> UC19
    A --> UC2

    G --> UC12
    S --> UC14
    S --> UC15
```

---

## 2. Diagrama de Clases

```mermaid
classDiagram
    direction TB

    class User {
        +int id
        +str name
        +str email
        +str password_hash
        +str profile_photo_base64
        +str role
        +str google_email
        +str google_access_token
        +str google_refresh_token
        +str google_token_expiry
        +str expo_push_token
        +str gcal_channel_id
        +str gcal_watch_expiry
        +datetime created_at
        +datetime updated_at
        +bool is_admin()
        +bool has_google()
    }

    class Task {
        +int id
        +int user_id
        +str title
        +str description
        +date due_date
        +time due_time
        +str priority
        +str status
        +datetime created_at
        +datetime updated_at
        +bool is_done()
        +bool is_pending()
        +bool is_overdue()
        +int priority_level()
    }

    class Event {
        +int id
        +int user_id
        +str title
        +str description
        +date event_date
        +time event_time
        +str location
        +str event_type
        +str gcal_event_id
        +datetime created_at
        +datetime updated_at
        +bool is_synced_with_gcal()
    }

    class Meeting {
        +int id
        +int user_id
        +str title
        +str description
        +date meeting_date
        +time meeting_time
        +int duration_minutes
        +str location
        +str status
        +datetime created_at
        +datetime updated_at
        +bool is_scheduled()
        +bool is_cancelled()
        +float duration_hours()
    }

    class MeetingParticipant {
        +int id
        +int meeting_id
        +str participant_name
        +str participant_email
        +datetime created_at
    }

    class Note {
        +int id
        +int user_id
        +str title
        +str content
        +str status
        +datetime created_at
        +datetime updated_at
        +bool is_active()
        +bool is_archived()
        +str preview()
    }

    class Conversation {
        +int id
        +int user_id
        +str title
        +datetime created_at
        +datetime updated_at
        +int message_count()
        +Message last_message()
    }

    class Message {
        +int id
        +int conversation_id
        +str role
        +str content
        +str intent
        +str sentiment
        +datetime created_at
        +bool is_from_user()
        +bool is_from_assistant()
        +bool is_positive()
    }

    User "1" --> "0..*" Task : owns
    User "1" --> "0..*" Event : owns
    User "1" --> "0..*" Meeting : owns
    User "1" --> "0..*" Note : owns
    User "1" --> "0..*" Conversation : has

    Meeting "1" --> "0..*" MeetingParticipant : has

    Conversation "1" --> "1..*" Message : contains
```

---

## 3. Diagramas de Flujo / Actividad

### 3.1 Flujo de Autenticación

```mermaid
flowchart TD
    Start([Inicio]) --> A{¿Tiene cuenta?}

    A -- No --> B[Registrarse con email + contraseña]
    B --> B1[Verificar email único]
    B1 -- Duplicado --> B2[Error 409: email ya registrado]
    B2 --> Start
    B1 -- Libre --> B3[Hashear contraseña bcrypt]
    B3 --> B4[Crear usuario en BD]
    B4 --> Tokens

    A -- Sí, email --> C[Enviar email + contraseña]
    C --> C1{¿Credenciales válidas?}
    C1 -- No --> C2[Error 401]
    C2 --> Start
    C1 -- Sí --> Tokens

    A -- Sí, Google --> D[OAuth2 con Google]
    D --> D1[Recibir google_access_token + email]
    D1 --> D2{¿Usuario existe?}
    D2 -- No --> D3[Crear usuario automático]
    D3 --> D4[Guardar tokens Google]
    D2 -- Sí --> D4
    D4 --> Tokens

    Tokens[Generar Access Token + Refresh Token JWT] --> E[Devolver tokens al cliente]
    E --> F([Usuario autenticado])

    F --> G{¿Access token expirado?}
    G -- Sí --> H[Enviar Refresh Token]
    H --> I{¿Refresh válido?}
    I -- Sí --> Tokens
    I -- No --> Start
```

### 3.2 Flujo CRUD del Planificador

```mermaid
flowchart TD
    Start([Cliente autenticado]) --> A[Enviar petición con Bearer Token]
    A --> B{¿Token válido?}
    B -- No --> Err401([Error 401])
    B -- Sí --> C{Operación}

    C -- GET --> D[Listar / Obtener ítem]
    D --> D1[(PostgreSQL — SELECT)]
    D1 --> D2[Devolver lista / objeto JSON]

    C -- POST --> E[Validar campos requeridos]
    E --> E1[(PostgreSQL — INSERT)]
    E1 --> E2{¿Evento con Google Calendar?}
    E2 -- Sí --> E3[Crear evento en GCal API]
    E3 --> E4[Guardar gcal_event_id]
    E4 --> OK
    E2 -- No --> OK

    C -- PUT --> F[Validar campos actualizables]
    F --> F1[(PostgreSQL — UPDATE)]
    F1 --> F2{¿Evento sincronizado?}
    F2 -- Sí --> F3[Actualizar en GCal API]
    F3 --> OK
    F2 -- No --> OK

    C -- DELETE --> G[(PostgreSQL — DELETE CASCADE)]
    G --> G1{¿Evento sincronizado?}
    G1 -- Sí --> G2[Eliminar en GCal API]
    G2 --> OK
    G1 -- No --> OK

    OK([200 / 201 OK]) --> N{¿Notificación push?}
    N -- Sí --> P[Enviar push via Expo]
    N -- No --> End([Fin])
    P --> End
```

### 3.3 Flujo del Asistente IA — Stella

```mermaid
flowchart TD
    Start([Usuario envía mensaje]) --> A[POST /v1/assistant/chat]
    A --> Auth{¿Autenticado?}
    Auth -- No --> Err([Error 401])
    Auth -- Sí --> B[Detectar idioma: es / en]

    B --> C[Construir contexto RAG]
    C --> C1[Cargar tareas del usuario]
    C --> C2[Cargar notas del usuario]
    C --> C3[Cargar reuniones del usuario]
    C --> C4[Cargar eventos del usuario]

    C1 & C2 & C3 & C4 --> D[Enviar al LLM — Ollama qwen2.5:7b]
    D --> E[LLM detecta intención + entidades]

    E --> F{¿Qué intención?}

    F -- create_task --> G1[Crear tarea vía task_repository]
    F -- update_task --> G2[Actualizar tarea]
    F -- delete_task --> G3[Eliminar tarea]
    F -- create_event --> H1[Crear evento + opcionalmente en GCal]
    F -- create_meeting --> I1[Crear reunión + participantes]
    F -- create_note --> J1[Crear nota]
    F -- list / query --> K1[Responder con datos de contexto]
    F -- conversational --> K2[Responder en lenguaje natural]

    G1 & G2 & G3 & H1 & I1 & J1 & K1 & K2 --> L[Guardar mensaje en Conversation]
    L --> M[Devolver respuesta al cliente]
    M --> End([Fin])
```

### 3.4 Flujo de Sincronización con Google Calendar

```mermaid
flowchart TD
    Start([Inicio]) --> A{¿Origen?}

    A -- Usuario conecta GCal --> B[OAuth2 Google → guardar tokens]
    B --> B1[Crear watch channel GCal]
    B1 --> B2[Guardar gcal_channel_id + watch_expiry]

    A -- Webhook de Google --> C[POST /v1/google-calendar/webhook]
    C --> C1[Validar canal y token]
    C1 --> C2[Obtener cambios de GCal API]
    C2 --> C3{¿Tipo de cambio?}
    C3 -- Nuevo evento --> C4[Crear Event en BD]
    C3 -- Evento actualizado --> C5[Actualizar Event en BD]
    C3 -- Evento eliminado --> C6[Eliminar Event en BD]

    A -- Usuario crea Evento --> D[POST /planner/events]
    D --> D1[INSERT en BD]
    D1 --> D2[Llamar GCal API — events.insert]
    D2 --> D3[Guardar gcal_event_id en BD]

    A -- Usuario actualiza Evento --> E[PUT /planner/events/:id]
    E --> E1[UPDATE en BD]
    E1 --> E2{¿gcal_event_id existe?}
    E2 -- Sí --> E3[Llamar GCal API — events.update]
    E2 -- No --> Done

    A -- Usuario elimina Evento --> F[DELETE /planner/events/:id]
    F --> F1{¿gcal_event_id existe?}
    F1 -- Sí --> F2[Llamar GCal API — events.delete]
    F1 -- No --> Done
    F2 --> Done

    C4 & C5 & C6 & D3 & E3 --> Done([Sincronización completada])
```

---

## 4. Diagramas de Secuencia

### 4.1 Secuencia: Registro e Inicio de Sesión

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cliente (Web / Mobile)
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant JWT as JWT Service

    Note over U,JWT: Registro
    U->>C: Rellena nombre, email, contraseña
    C->>API: POST /v1/auth/register {name, email, password}
    API->>DB: SELECT users WHERE email = ?
    DB-->>API: null (no existe)
    API->>API: bcrypt.hash(password)
    API->>DB: INSERT INTO users
    DB-->>API: {id, email, ...}
    API->>JWT: create_access_token(uid)
    API->>JWT: create_refresh_token(uid)
    JWT-->>API: access_token, refresh_token
    API-->>C: 201 {access_token, refresh_token, user}
    C-->>U: Redirige al dashboard

    Note over U,JWT: Renovación de token
    C->>API: POST /v1/auth/refresh {refresh_token}
    API->>JWT: decode_refresh_token()
    JWT-->>API: {uid, sub}
    API->>DB: SELECT users WHERE id = uid
    DB-->>API: user
    API->>JWT: create_access_token + create_refresh_token
    JWT-->>API: nuevos tokens
    API-->>C: {access_token, refresh_token}
```

### 4.2 Secuencia: Chat con Stella (Asistente IA)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cliente
    participant API as FastAPI /assistant/chat
    participant RAG as RAG Service
    participant DB as PostgreSQL
    participant LLM as Ollama — qwen2.5:7b

    U->>C: Escribe o dicta un mensaje
    C->>API: POST /v1/assistant/chat {conversation_id, message, language}
    API->>API: Validar Bearer Token

    par Construir contexto
        API->>DB: list_tasks(user_id)
        DB-->>API: tareas
        API->>DB: list_notes(user_id)
        DB-->>API: notas
        API->>DB: list_meetings(user_id)
        DB-->>API: reuniones
        API->>DB: list_events(user_id)
        DB-->>API: eventos
    end

    API->>RAG: build_context(user_data)
    RAG-->>API: prompt enriquecido

    API->>LLM: POST /api/chat {model, messages, context}
    LLM-->>API: {intent, entities, response_text}

    alt intent == create_task
        API->>DB: INSERT INTO tasks
        DB-->>API: task creada
    else intent == create_event
        API->>DB: INSERT INTO events
        DB-->>API: evento creado
    else intent == list / conversational
        Note over API: Solo genera respuesta textual
    end

    API->>DB: INSERT INTO messages (role=user)
    API->>DB: INSERT INTO messages (role=assistant)
    API-->>C: {response, intent, updated_items}
    C-->>U: Muestra respuesta de Stella
```

### 4.3 Secuencia: Crear Tarea desde el Planificador

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cliente (Web / Mobile)
    participant API as FastAPI /planner
    participant DB as PostgreSQL
    participant Notif as Expo Push Service

    U->>C: Rellena formulario de tarea
    C->>API: POST /v1/planner/tasks {title, due_date, priority, ...}
    API->>API: Validar Bearer Token → user_id

    API->>DB: INSERT INTO tasks (user_id, title, ...)
    DB-->>API: {id, title, status: "pending", ...}

    API->>DB: SELECT expo_push_token WHERE user_id
    DB-->>API: push_token

    alt push_token existe
        API->>Notif: send_push(token, "Tarea creada: {title}")
        Notif-->>API: ok
    end

    API-->>C: 201 {task}
    C-->>U: Muestra tarea en la lista
```

### 4.4 Secuencia: Sincronización Webhook de Google Calendar

```mermaid
sequenceDiagram
    participant GCal as Google Calendar
    participant API as FastAPI /google-calendar
    participant DB as PostgreSQL

    Note over GCal,DB: Notificación de cambio en GCal
    GCal->>API: POST /v1/google-calendar/webhook\n(X-Goog-Channel-Id, X-Goog-Resource-State)
    API->>DB: SELECT user WHERE gcal_channel_id = ?
    DB-->>API: user (con google_access_token)

    API->>GCal: GET /calendar/v3/events (token de usuario)
    GCal-->>API: lista de eventos modificados

    loop Por cada evento
        alt Evento nuevo
            API->>DB: INSERT INTO events
        else Evento actualizado
            API->>DB: UPDATE events WHERE gcal_event_id = ?
        else Evento eliminado
            API->>DB: DELETE FROM events WHERE gcal_event_id = ?
        end
    end

    API-->>GCal: 200 OK
```
