const BASE_URL = 'https://apidelvo.gromber05.dev';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserDto;
}

export interface TaskDto {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EventDto {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  event_type: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingDto {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes?: number;
  location?: string;
  participants: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NoteDto {
  id: number;
  user_id: number;
  title: string;
  content?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListResponse<T> {
  items: T[];
}

export interface ItemResponse<T> {
  item: T;
}

export interface AssistantChatTurn {
  role: string;
  content: string;
}

export interface AssistantChatResponse {
  intent: string;
  data: Record<string, unknown>;
  message: string;
  context_used: string[];
}

// ─── Token store ──────────────────────────────────────────────────────────────

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

// ─── Request helper ───────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? body?.message ?? message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  // Tasks
  listTasks: () => request<ListResponse<TaskDto>>('/api/v1/planner/tasks'),
  createTask: (body: {
    title: string;
    description?: string;
    due_date?: string;
    due_time?: string;
    priority?: string;
    status?: string;
  }) =>
    request<ItemResponse<TaskDto>>('/api/v1/planner/tasks', {
      method: 'POST',
      body: JSON.stringify({ priority: 'medium', status: 'pending', ...body }),
    }),
  deleteTask: (id: number) =>
    request<{ ok: boolean }>(`/api/v1/planner/tasks/${id}`, { method: 'DELETE' }),

  // Events
  listEvents: () => request<ListResponse<EventDto>>('/api/v1/planner/events'),
  createEvent: (body: {
    title: string;
    event_date: string;
    event_time?: string;
    description?: string;
    location?: string;
    event_type?: string;
  }) =>
    request<ItemResponse<EventDto>>('/api/v1/planner/events', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'general', ...body }),
    }),
  updateEvent: (
    id: number,
    body: { title: string; event_date: string; event_time?: string },
  ) =>
    request<ItemResponse<EventDto>>(`/api/v1/planner/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ event_type: 'general', ...body }),
    }),

  // Meetings
  listMeetings: () => request<ListResponse<MeetingDto>>('/api/v1/planner/meetings'),
  createMeeting: (body: {
    title: string;
    meeting_date: string;
    meeting_time: string;
    description?: string;
    duration_minutes?: number;
    location?: string;
    participants?: string[];
    status?: string;
  }) =>
    request<ItemResponse<MeetingDto>>('/api/v1/planner/meetings', {
      method: 'POST',
      body: JSON.stringify({ participants: [], status: 'scheduled', ...body }),
    }),
  updateMeeting: (
    id: number,
    body: { title: string; meeting_date: string; meeting_time: string },
  ) =>
    request<ItemResponse<MeetingDto>>(`/api/v1/planner/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ participants: [], status: 'scheduled', ...body }),
    }),

  // Notes
  listNotes: () => request<ListResponse<NoteDto>>('/api/v1/planner/notes'),
  createNote: (body: { title: string; content?: string; status?: string }) =>
    request<ItemResponse<NoteDto>>('/api/v1/planner/notes', {
      method: 'POST',
      body: JSON.stringify({ status: 'active', ...body }),
    }),

  // Assistant
  chat: (message: string, history: AssistantChatTurn[]) =>
    request<AssistantChatResponse>('/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, use_rag: true, history, language: 'es' }),
    }),
};
