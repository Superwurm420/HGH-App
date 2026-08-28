/**
 * API-Client für den Adminbereich.
 *
 * Frontend und API laufen im selben Cloudflare-Worker, also auf derselben
 * Origin: Alle Pfade sind relativ, es gibt keine API-URL zu konfigurieren und
 * das Session-Cookie wird ohne CORS-Sonderregeln mitgeschickt.
 *
 * Die öffentlichen Seiten benutzen diesen Client nicht — sie lesen als Server
 * Components direkt aus D1 (siehe src/server/services/).
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const message = (body as { error?: string } | null)?.error;
  return new ApiError(message ?? fallback, response.status);
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw await toApiError(response, `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Upload per multipart — hier darf kein Content-Type gesetzt werden. */
async function uploadFetch<T>(path: string, formData: FormData, fallback: string): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw await toApiError(response, fallback);
  }

  return response.json() as Promise<T>;
}

// ── Gemeinsame Datentypen ──────────────────────────────────────────

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

export interface UploadData {
  id: string;
  filename: string;
  file_size: number;
  calendar_week: number | null;
  half_year: number | null;
  status: string;
  parse_error: string | null;
  entry_count: number;
  class_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaData {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

/** Formt einen Datensatz für die Anzeige-Komponenten um. */
export function toDisplayAnnouncement(item: AnnouncementData) {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    expires: item.expires ?? undefined,
    body: item.body,
    highlight: item.highlight === 1,
  };
}

// ── Ersteinrichtung & Anmeldung ────────────────────────────────────

export interface SetupStatus {
  dbReady: boolean;
  hasUsers: boolean;
  passwordConfigured: boolean;
  adminUser: string;
}

export function checkSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/api/admin/setup-status');
}

export function adminLogin(username: string, password: string): Promise<{ ok: boolean; username: string }> {
  return apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function adminLogout(): Promise<void> {
  await apiFetch('/api/admin/logout', { method: 'POST' });
}

export function checkAdminSession(): Promise<{ authenticated: boolean; username?: string }> {
  return apiFetch('/api/admin/session');
}

/**
 * Ändert das eigene Passwort. Die aktuelle Sitzung bleibt bestehen, alle
 * anderen Anmeldungen werden dabei serverseitig beendet.
 */
export async function adminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/admin/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Ankündigungen ──────────────────────────────────────────────────

export function adminFetchAnnouncements(): Promise<{ announcements: AnnouncementData[] }> {
  return apiFetch('/api/admin/announcements');
}

export function adminCreateAnnouncement(data: Partial<AnnouncementData>): Promise<AnnouncementData> {
  return apiFetch('/api/admin/announcements', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateAnnouncement(id: string, data: Partial<AnnouncementData>): Promise<AnnouncementData> {
  return apiFetch(`/api/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function adminDeleteAnnouncement(id: string): Promise<void> {
  await apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
}

// ── Termine ────────────────────────────────────────────────────────

export function adminFetchEvents(): Promise<{ events: EventData[] }> {
  return apiFetch('/api/admin/events');
}

export function adminCreateEvent(data: Partial<EventData>): Promise<EventData> {
  return apiFetch('/api/admin/events', { method: 'POST', body: JSON.stringify(data) });
}

export function adminUpdateEvent(id: string, data: Partial<EventData>): Promise<EventData> {
  return apiFetch(`/api/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function adminDeleteEvent(id: string): Promise<void> {
  await apiFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
}

// ── Stundenplan-Uploads ────────────────────────────────────────────

export function adminFetchUploads(): Promise<{ uploads: UploadData[] }> {
  return apiFetch('/api/admin/uploads');
}

/**
 * Lädt PDF und den im Browser ausgewerteten Stundenplan gemeinsam hoch.
 * Der Server parst nichts mehr selbst, prüft die Daten aber vollständig.
 */
export function adminUploadTimetable(file: File, schedule: unknown): Promise<UploadData> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('schedule', JSON.stringify(schedule));
  return uploadFetch<UploadData>('/api/admin/uploads', formData, 'Upload fehlgeschlagen.');
}

export async function adminActivateUpload(id: string): Promise<void> {
  await apiFetch(`/api/admin/uploads/${id}/activate`, { method: 'POST' });
}

export async function adminDeleteUpload(id: string): Promise<void> {
  await apiFetch(`/api/admin/uploads/${id}`, { method: 'DELETE' });
}

// ── Einstellungen ──────────────────────────────────────────────────

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export function adminFetchSettings(): Promise<{ settings: SettingRow[] }> {
  return apiFetch('/api/admin/settings');
}

export async function adminSaveSettings(settings: Record<string, string>): Promise<void> {
  await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
}

// ── Bilder (TV-Slideshow) ──────────────────────────────────────────

export function adminFetchMedia(): Promise<{ media: MediaData[] }> {
  return apiFetch('/api/admin/media');
}

export function adminUploadImage(file: File): Promise<MediaData> {
  const formData = new FormData();
  formData.append('file', file);
  return uploadFetch<MediaData>('/api/admin/media', formData, 'Bild-Upload fehlgeschlagen.');
}

export async function adminDeleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
}

/** Öffentliche URL eines hochgeladenen Bildes. */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}
