import { AppSetting } from '../types';

/** Schlüssel, die ohne Anmeldung gelesen werden dürfen. */
export const PUBLIC_SETTING_KEYS = [
  'school_name',
  'school_short',
  'calendar_urls',
  'messages',
  'school_holidays',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export function isPublicSettingKey(key: string): key is PublicSettingKey {
  return (PUBLIC_SETTING_KEYS as readonly string[]).includes(key);
}

/**
 * Schlüssel, die der Einstellungen-Tab schreiben darf.
 *
 * `active_timetable_id` fehlt hier bewusst: Der aktive Stundenplan wird über das
 * Aktivieren eines Uploads gesetzt, damit Setting und Upload-Status nicht
 * auseinanderlaufen können.
 */
export const EDITABLE_SETTING_KEYS = PUBLIC_SETTING_KEYS;

export function isEditableSettingKey(key: string): boolean {
  return (EDITABLE_SETTING_KEYS as readonly string[]).includes(key);
}

/** Lädt die öffentlich lesbaren Einstellungen als Key-Value-Objekt. */
export async function loadPublicSettings(db: D1Database): Promise<Record<string, string>> {
  const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(',');
  const rows = await db.prepare(
    `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`
  ).bind(...PUBLIC_SETTING_KEYS).all<AppSetting>();

  const settings: Record<string, string> = {};
  for (const row of rows.results) {
    settings[row.key] = row.value;
  }
  return settings;
}

/** Alle Einstellungen (nur Adminbereich). */
export async function loadAllSettings(db: D1Database): Promise<AppSetting[]> {
  const rows = await db.prepare('SELECT * FROM app_settings ORDER BY key').all<AppSetting>();
  return rows.results;
}

/**
 * Liest eine Einstellung als JSON. Ungültiges JSON liefert den Fallback statt
 * zu werfen — die Startseite darf an einer kaputten Einstellung nicht scheitern.
 */
export function parseJsonSetting<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
