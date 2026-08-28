import { Announcement } from '../types';

/** Trennt das Klassen-Feld ("HT11, G21") in normalisierte Codes auf. */
export function splitClasses(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Eine Ankündigung gilt für eine Klasse, wenn sie keine Klassen einschränkt
 * oder die Klasse explizit nennt.
 */
export function matchesClass(classes: string | null | undefined, klasse: string): boolean {
  const codes = splitClasses(classes);
  return codes.length === 0 || codes.includes(klasse.toUpperCase());
}

/**
 * Lädt alle noch nicht abgelaufenen Ankündigungen, optional für eine Klasse.
 * Wird von `/api/announcements` und direkt von den Server Components genutzt.
 */
export async function loadActiveAnnouncements(
  db: D1Database,
  klasse?: string | null,
): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const rows = await db.prepare(
    `SELECT * FROM announcements
     WHERE expires IS NULL OR expires = '' OR expires > ?
     ORDER BY highlight DESC, date DESC`
  ).bind(now).all<Announcement>();

  if (!klasse) return rows.results;
  return rows.results.filter((item) => matchesClass(item.classes, klasse));
}

/** Alle Ankündigungen inklusive abgelaufener (nur Adminbereich). */
export async function loadAllAnnouncements(db: D1Database): Promise<Announcement[]> {
  const rows = await db.prepare(
    'SELECT * FROM announcements ORDER BY date DESC'
  ).all<Announcement>();
  return rows.results;
}
