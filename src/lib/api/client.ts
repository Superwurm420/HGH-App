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
  /** Es gibt ein Konto, für das noch kein Passwort vergeben ist. */
  needsPassword: boolean;
  adminUser: string;
}

export function checkSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/api/admin/setup-status');
}

export interface LoginResponse {
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

// ── Stundenplan-Uploads ────────────────────────────────────────────

export function adminFetchUploads(): Promise<{ uploads: UploadData[] }> {
  return apiFetch('/api/admin/uploads');
}

/**
 * Lädt PDF und den im Browser ausgewerteten Stundenplan gemeinsam hoch.
 * Der Server parst nichts mehr selbst, prüft die Daten aber vollständig.
 */
export function adminUploadTimetable(file: File, schedule: unknown): Promise<UploadData> {
  return postFile<UploadData>('/api/admin/uploads', file, { schedule });
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
  return postFile<MediaData>('/api/admin/media', file);
}

export async function adminDeleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
}

/** Öffentliche URL eines hochgeladenen Bildes. */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}
