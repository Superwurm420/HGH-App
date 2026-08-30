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

import { arrayBufferToBase64 } from '@/lib/base64';

class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const parsed = body as { error?: string; detail?: string } | null;
  // `detail` liefern nur die Upload-Routen, damit im Adminbereich die
  // technische Ursache sichtbar ist statt nur ein allgemeiner Satz.
  const message = parsed?.error
    ? parsed.detail ? `${parsed.error} (${parsed.detail})` : parsed.error
    : fallback;
  return new ApiError(message, response.status);
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

/**
 * Schickt eine Datei als JSON-Feld (Base64) statt als Multipart.
 *
 * `request.formData()` scheiterte im Worker reproduzierbar auf iOS, während
 * der JSON-Weg — den alle übrigen Admin-Aufrufe ohnehin gehen — durchkommt.
 */
async function postFile<T>(path: string, file: File, extra: Record<string, unknown> = {}): Promise<T> {
  const dataBase64 = arrayBufferToBase64(await file.arrayBuffer());
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, dataBase64, ...extra }),
  });
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

// ── Ersteinrichtung & Anmeldung ────────────────────────────────────

export interface SetupStatus {
  dbReady: boolean;
  hasUsers: boolean;
  /** Es gibt ein Konto, für das noch kein Passwort vergeben ist. */
  needsPassword: boolean;
  adminUser: string;
}

export function checkSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/api/admin/setup-status');
}

interface LoginResponse {
  ok: boolean;
  username: string;
  /** Jetzt muss ein Passwort vergeben werden, bevor irgendetwas anderes geht. */
  mustSetPassword: boolean;
}

/**
 * Meldet am Adminbereich an. Bei der Ersteinrichtung bleibt `password` leer —
 * das Konto wird dabei angelegt und hat noch kein Passwort.
 */
export function adminLogin(username: string, password: string): Promise<LoginResponse> {
  return apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function adminLogout(): Promise<void> {
  await apiFetch('/api/admin/logout', { method: 'POST' });
}

export function checkAdminSession(): Promise<{
  authenticated: boolean;
  username?: string;
  mustSetPassword?: boolean;
}> {
  return apiFetch('/api/admin/session');
}

/**
 * Setzt das eigene Passwort — Erstvergabe wie Wechsel.
 *
 * `currentPassword` bleibt bei der Erstvergabe leer; der Server prüft es nur,
 * wenn das Konto bereits ein Passwort hat. Die aktuelle Sitzung bleibt
 * bestehen, alle anderen Anmeldungen werden serverseitig beendet.
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

// ── Rückmeldungen ──────────────────────────────────────────────────

export interface FeedbackData {
  id: string;
  message: string;
  category: string;
  contact: string;
  klasse: string;
  page: string;
  status: 'new' | 'done';
  created_at: string;
}

/**
 * Rückmeldung absenden — der einzige Aufruf hier, der keine Anmeldung braucht.
 * Er steht trotzdem in dieser Datei, weil das Formular im Browser läuft und
 * dieselbe Fehlerbehandlung bekommen soll wie der Rest.
 */
export async function submitFeedback(data: {
  message: string;
  category: string;
  contact?: string;
  klasse?: string;
  page?: string;
}): Promise<void> {
  await apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify(data) });
}

export function adminFetchFeedback(): Promise<{ feedback: FeedbackData[] }> {
  return apiFetch('/api/admin/feedback');
}

export function adminSetFeedbackStatus(id: string, status: 'new' | 'done'): Promise<FeedbackData> {
  return apiFetch(`/api/admin/feedback/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function adminDeleteFeedback(id: string): Promise<void> {
  await apiFetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
}

// ── Stundenplan-Uploads ────────────────────────────────────────────

export function adminFetchUploads(): Promise<{ uploads: UploadData[] }> {
  return apiFetch('/api/admin/uploads');
}

/**
 * Lädt PDF und den im Browser ausgewerteten Stundenplan gemeinsam hoch.
 * Der Server parst nichts mehr selbst, prüft die Daten aber vollständig.
 */
export function adminUploadTimetable(
  file: File,
  schedule: unknown,
): Promise<UploadData & { activated?: boolean }> {
  return postFile('/api/admin/uploads', file, { schedule });
}

/** Klassen des aktiven Stundenplans — Vorlage für die Klassenauswahl. */
export function fetchTimetableClasses(): Promise<{ classes: string[] }> {
  return apiFetch('/api/timetable/classes');
}

export async function adminActivateUpload(id: string): Promise<void> {
  await apiFetch(`/api/admin/uploads/${id}/activate`, { method: 'POST' });
}

export async function adminDeleteUpload(id: string): Promise<void> {
  await apiFetch(`/api/admin/uploads/${id}`, { method: 'DELETE' });
}

// ── Einstellungen ──────────────────────────────────────────────────

interface SettingRow {
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

/** Einzelne Einstellung speichern — für Schalter, die sofort gelten sollen. */
export async function adminSaveSetting(key: string, value: string): Promise<void> {
  await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ key, value }) });
}

// ── Bilder (TV-Slideshow) ──────────────────────────────────────────

export function adminFetchMedia(): Promise<{ media: MediaData[] }> {
  return apiFetch('/api/admin/media');
}

export function adminUploadImage(file: File): Promise<MediaData> {
  return postFile<MediaData>('/api/admin/media', file);
}

export async function adminDeleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
}

/** Öffentliche URL eines hochgeladenen Bildes. */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}
