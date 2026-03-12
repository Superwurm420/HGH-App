/**
 * API-Client für die Kommunikation mit dem Cloudflare Worker Backend.
 * Wird sowohl server-seitig (SSR) als auch client-seitig verwendet.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type FetchOptions = Omit<RequestInit, 'method'>;

async function apiFetch<T>(path: string, options?: FetchOptions & { method?: string }): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    throw new ApiError(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Timetable ──────────────────────────────────────────────────────

export interface LessonEntry {
  period: number;
  periodEnd?: number;
  time: string;
  subject?: string;
  detail?: string;
  room?: string;
}

export type Weekday = 'MO' | 'DI' | 'MI' | 'DO' | 'FR';
export type WeekPlan = Record<Weekday, LessonEntry[]>;

export interface TimetableResponse {
  upload: {
    id: string;
    filename: string;
    calendar_week: number | null;
    half_year: number | null;
    updated_at: string;
  } | null;
  entries: Record<string, WeekPlan>;
  classes: string[];
  todayKey: string;
}

export async function fetchTimetable(klasse?: string): Promise<TimetableResponse> {
  const params = klasse ? `?klasse=${encodeURIComponent(klasse)}` : '';
  return apiFetch<TimetableResponse>(`/api/timetable${params}`);
}

export async function fetchTimetableClasses(): Promise<{ classes: string[] }> {
  return apiFetch<{ classes: string[] }>('/api/timetable/classes');
}

// ── Announcements ──────────────────────────────────────────────────

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  date: string;
  expires: string | null;
  audience: string;
  classes: string;
  highlight: number;
  created_at: string;
  updated_at: string;
}

/** Transformiert AnnouncementData für die Anzeige-Komponenten. */
export function toDisplayAnnouncement(a: AnnouncementData) {
  return {
    id: a.id,
    title: a.title,
    date: a.date,
    expires: a.expires ?? undefined,
    body: a.body,
    highlight: a.highlight === 1,
  };
}

export async function fetchAnnouncements(klasse?: string): Promise<{ announcements: AnnouncementData[] }> {
  const params = klasse ? `?klasse=${encodeURIComponent(klasse)}` : '';
  return apiFetch<{ announcements: AnnouncementData[] }>(`/api/announcements${params}`);
}

// ── Events ─────────────────────────────────────────────────────────

export interface EventData {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  all_day: number;
  category: string;
  classes: string;
}

export async function fetchEvents(klasse?: string): Promise<{ events: EventData[] }> {
  const params = klasse ? `?klasse=${encodeURIComponent(klasse)}` : '';
  return apiFetch<{ events: EventData[] }>(`/api/events${params}`);
}

// ── Settings ───────────────────────────────────────────────────────

export async function fetchSettings(): Promise<{ settings: Record<string, string> }> {
  return apiFetch<{ settings: Record<string, string> }>('/api/settings');
}

// ── Bootstrap ──────────────────────────────────────────────────────

export interface BootstrapResponse {
  timetable: TimetableResponse;
  announcements: AnnouncementData[];
  version: string;
}

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return apiFetch<BootstrapResponse>('/api/bootstrap');
}

// ── Admin Auth ─────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<{ ok: boolean; username: string }> {
  return apiFetch<{ ok: boolean; username: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
}

export async function adminLogout(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/admin/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; username?: string }> {
  return apiFetch<{ authenticated: boolean; username?: string }>('/api/admin/session', {
    credentials: 'include',
  });
}

// ── Admin CRUD ─────────────────────────────────────────────────────

export async function adminFetchAnnouncements(): Promise<{ announcements: AnnouncementData[] }> {
  return apiFetch<{ announcements: AnnouncementData[] }>('/api/admin/announcements', {
    credentials: 'include',
  });
}

export async function adminCreateAnnouncement(data: Partial<AnnouncementData>): Promise<AnnouncementData> {
  return apiFetch<AnnouncementData>('/api/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  });
}

export async function adminUpdateAnnouncement(id: string, data: Partial<AnnouncementData>): Promise<AnnouncementData> {
  return apiFetch<AnnouncementData>(`/api/admin/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  });
}

export async function adminDeleteAnnouncement(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/announcements/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function adminFetchUploads(): Promise<{ uploads: Array<{
  id: string;
  filename: string;
  file_size: number;
  calendar_week: number | null;
  half_year: number | null;
  status: string;
  parse_error: string | null;
  created_at: string;
  updated_at: string;
}> }> {
  return apiFetch('/api/admin/uploads', { credentials: 'include' });
}

export async function adminUploadPdf(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${API_BASE}/api/admin/uploads`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
    throw new ApiError((error as { error?: string }).error ?? 'Upload fehlgeschlagen', response.status);
  }
  return response.json();
}

export async function adminActivateUpload(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/uploads/${id}/activate`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function adminDeleteUpload(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/uploads/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function adminFetchEvents(): Promise<{ events: EventData[] }> {
  return apiFetch<{ events: EventData[] }>('/api/admin/events', {
    credentials: 'include',
  });
}

export async function adminCreateEvent(data: Partial<EventData>): Promise<EventData> {
  return apiFetch<EventData>('/api/admin/events', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'include',
  });
}

export async function adminUpdateEvent(id: string, data: Partial<EventData>): Promise<EventData> {
  return apiFetch<EventData>(`/api/admin/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    credentials: 'include',
  });
}

export async function adminDeleteEvent(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/admin/events/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}
