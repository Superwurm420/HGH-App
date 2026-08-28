/**
 * Typen für die Server-Schicht (Route Handlers + Server Components).
 *
 * Die Cloudflare-Bindings werden über `CloudflareEnv` deklariert — dieselbe
 * globale Schnittstelle, die auch `getCloudflareContext()` zurückgibt.
 */

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    STORAGE: R2Bucket;
    ADMIN_USER?: string;
  }
}

/** Angemeldeter Admin-Benutzer. */
export interface AuthContext {
  userId: string;
  username: string;
  /**
   * Für das Konto ist noch kein Passwort vergeben (Ersteinrichtung).
   * Solange das gilt, lässt `withAdmin` nur die Passwort-Route durch.
   */
  mustSetPassword: boolean;
}

/** Wochentags-Codes im Stundenplan. */
export type Weekday = 'MO' | 'DI' | 'MI' | 'DO' | 'FR';

export const WEEKDAYS: readonly Weekday[] = ['MO', 'DI', 'MI', 'DO', 'FR'];

/** Eine einzelne Unterrichtsstunde. */
export interface LessonEntry {
  period: number;
  periodEnd?: number;
  time: string;
  subject?: string;
  detail?: string;
  room?: string;
}

/** Wochenplan einer Klasse. */
export type WeekPlan = Record<Weekday, LessonEntry[]>;

/** Kompletter geparster Stundenplan: Klassencode → Wochenplan. */
export type ParsedSchedule = Record<string, WeekPlan>;

/** Metadaten eines Stundenplan-Uploads. */
export interface TimetableUpload {
  id: string;
  filename: string;
  r2_key: string;
  file_size: number;
  calendar_week: number | null;
  half_year: number | null;
  year_start: number | null;
  year_end_short: number | null;
  status: 'uploaded' | 'parsing' | 'parsed' | 'active' | 'error' | 'archived';
  parse_error: string | null;
  parse_started_at: string | null;
  parse_finished_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Ankündigung aus D1. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  expires: string | null;
  audience: string;
  classes: string;
  highlight: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Termin aus D1. */
export interface EventRecord {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  all_day: number;
  category: string;
  classes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Datei im Medienarchiv (Bilder für die TV-Slideshow). */
export interface MediaFile {
  id: string;
  filename: string;
  r2_key: string;
  content_type: string;
  file_size: number;
  category: string;
  uploaded_by: string | null;
  created_at: string;
}

/** Key-Value-Eintrag aus app_settings. */
export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

/** Eintrag im Audit-Log. */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export {};
