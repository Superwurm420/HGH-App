/**
 * Cloudflare Worker Environment Bindings
 */
export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ADMIN_USER: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

/**
 * Erweiteter Request-Kontext für authentifizierte Routen
 */
export interface AuthContext {
  userId: string;
  username: string;
}

/** Weekday codes used in timetable */
export type Weekday = 'MO' | 'DI' | 'MI' | 'DO' | 'FR';

/** A single lesson entry from the parsed timetable */
export interface LessonEntry {
  period: number;
  periodEnd?: number;
  time: string;
  subject?: string;
  detail?: string;
  room?: string;
}

/** Weekly plan for one class */
export type WeekPlan = Record<Weekday, LessonEntry[]>;

/** Complete parsed schedule: className -> weekPlan */
export type ParsedSchedule = Record<string, WeekPlan>;

/** Timetable upload metadata */
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

/** Announcement record from D1 */
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

/** Event record from D1 */
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

/** App settings key-value */
export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

/** Audit log entry */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}
