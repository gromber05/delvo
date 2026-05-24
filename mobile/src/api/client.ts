const BASE_URL = 'https://apidelvo.gromber05.dev';

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  google_email?: string | null;
}

export interface AdminStatsDto {
  total_users: number;
  total_conversations: number;
  total_messages: number;
  intent_distribution: { intent: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number }[];
  daily_activity: { day: string; messages: number }[];
  top_users: { name: string; email: string; conversations: number }[];
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserDto;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
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
  gcal_event_id?: string | null;
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



let _token: string | null = null;
let _refreshToken: string | null = null;

type TokensRefreshedCallback = (accessToken: string, refreshToken: string) => void;
type AuthExpiredCallback = () => void;

let _onTokensRefreshed: TokensRefreshedCallback | null = null;
let _onAuthExpired: AuthExpiredCallback | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

export function setApiRefreshToken(token: string | null) {
  _refreshToken = token;
}


export function setOnTokensRefreshed(cb: TokensRefreshedCallback | null) {
  _onTokensRefreshed = cb;
}


export function setOnAuthExpired(cb: AuthExpiredCallback | null) {
  _onAuthExpired = cb;
}



let _refreshPromise: Promise<string | null> | null = null;


function tryRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    if (!_refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: _refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as RefreshResponse;
      _token = data.access_token;
      _refreshToken = data.refresh_token;
      _onTokensRefreshed?.(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}



async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const buildHeaders = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined ?? {}),
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(_token),
  });

  
  if (res.status === 401 && _token) {
    const newToken = await tryRefresh();
    if (newToken) {
      
      const retried = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders(newToken),
      });

      if (!retried.ok) {
        if (retried.status === 401) {
          _onAuthExpired?.();
          throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
        }
        let message = `HTTP ${retried.status}`;
        try {
          const body = await retried.json();
          message = body?.detail ?? body?.message ?? message;
        } catch {  }
        throw new Error(message);
      }

      return retried.json() as Promise<T>;
    }

    
    _onAuthExpired?.();
    throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? body?.message ?? message;
    } catch {  }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}



export const api = {
  
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
  updateTask: (
    id: number,
    body: {
      title: string;
      description?: string | null;
      due_date?: string | null;
      due_time?: string | null;
      priority: string;
      status: string;
    },
  ) =>
    request<ItemResponse<TaskDto>>(`/api/v1/planner/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteTask: (id: number) =>
    request<{ ok: boolean }>(`/api/v1/planner/tasks/${id}`, { method: 'DELETE' }),

  
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
  deleteEvent: (id: number) =>
    request<{ ok: boolean }>(`/api/v1/planner/events/${id}`, { method: 'DELETE' }),

  
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
  deleteMeeting: (id: number) =>
    request<{ ok: boolean }>(`/api/v1/planner/meetings/${id}`, { method: 'DELETE' }),

  listNotes: () => request<ListResponse<NoteDto>>('/api/v1/planner/notes'),
  createNote: (body: { title: string; content?: string; status?: string }) =>
    request<ItemResponse<NoteDto>>('/api/v1/planner/notes', {
      method: 'POST',
      body: JSON.stringify({ status: 'active', ...body }),
    }),

  
  chat: (message: string, history: AssistantChatTurn[]) =>
    request<AssistantChatResponse>('/api/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, use_rag: true, history, language: 'es' }),
    }),

  
  me: () => request<{ user: UserDto }>('/api/v1/auth/me'),

  googleCalendarConnectUrl: () =>
    request<{ url: string }>('/api/v1/google-calendar/connect?platform=mobile'),

  syncGoogleCalendar: () =>
    request<{ imported: number; skipped: number }>('/api/v1/google-calendar/sync', { method: 'POST' }),

  patchGoogleCalendarEvent: (
    gcalId: string,
    body: { summary?: string; start?: object; end?: object; description?: string; location?: string },
  ) =>
    request<GoogleCalendarEvent>(`/api/v1/google-calendar/events/${gcalId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  saveGoogleTokens: (tokens: {
    google_access_token: string;
    google_refresh_token?: string | null;
    google_token_expiry?: string | null;
    google_email?: string | null;
  }) =>
    request<{ ok: boolean; google_email?: string }>('/api/v1/auth/me/google-calendar', {
      method: 'PUT',
      body: JSON.stringify(tokens),
    }),

  registerPushToken: (token: string) =>
    request<{ ok: boolean }>('/api/v1/auth/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  adminStats: () => request<AdminStatsDto>('/api/v1/admin/stats'),
  adminUsers: () => request<{ items: { id: number; name: string; email: string; role: string; created_at: string }[] }>('/api/v1/admin/users'),
  adminUpdateRole: (userId: number, role: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  adminConversations: () =>
    request<{ items: { id: number; title: string; user_name: string; user_email: string; message_count: number; updated_at: string }[] }>('/api/v1/admin/conversations'),

  transcribeAudio: async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' } as unknown as Blob);
    const res = await fetch(`${BASE_URL}/api/v1/assistant/transcribe`, {
      method: 'POST',
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try { const b = await res.json(); message = b?.detail ?? message; } catch { }
      throw new Error(message);
    }
    const data = await res.json() as { text: string };
    return data.text;
  },

  listGoogleCalendarEvents: (params?: {
    time_min?: string;
    time_max?: string;
    max_results?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.time_min) qs.set('time_min', params.time_min);
    if (params?.time_max) qs.set('time_max', params.time_max);
    if (params?.max_results) qs.set('max_results', String(params.max_results));
    const q = qs.toString();
    return request<{ events: GoogleCalendarEvent[] }>(
      `/api/v1/google-calendar/events${q ? `?${q}` : ''}`,
    );
  },
};
