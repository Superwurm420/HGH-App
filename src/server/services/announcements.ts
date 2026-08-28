import { parseBerlinDate } from '@/lib/berlin-time';

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
 * Zeitpunkt einer Ankündigung als Millisekunden, oder `null`.
 *
 * `date` und `expires` stehen als "TT.MM.JJJJ HH:mm" in der Datenbank — ein
 * Erbe aus der Zeit, als Inhalte als TXT-Dateien gepflegt wurden. In diesem
 * Format ist die Zeichenkette nicht sortierbar: Sie beginnt mit dem Tag im
 * Monat, nicht mit dem Jahr. Deshalb werden Ablauf und Reihenfolge hier
 * ausgewertet und nicht im SQL.
 */
function timeOf(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  return parseBerlinDate(value)?.getTime() ?? null;
}

/** Abgelaufen ist nur, was ein lesbares Datum in der Vergangenheit trägt. */
function hasExpired(announcement: Announcement, now: number): boolean {
  const expires = timeOf(announcement.expires);
  return expires !== null && expires <= now;
}

/**
 * Neueste zuerst, hervorgehobene oben.
 * Ohne lesbares Datum ans Ende — dort stört ein kaputter Eintrag am wenigsten.
 */
function byHighlightThenNewest(a: Announcement, b: Announcement): number {
  if (a.highlight !== b.highlight) return b.highlight - a.highlight;
  return (timeOf(b.date) ?? -Infinity) - (timeOf(a.date) ?? -Infinity);
}

/**
 * Lädt alle noch nicht abgelaufenen Ankündigungen, optional für eine Klasse.
 * Wird von `/api/announcements` und direkt von den Server Components genutzt.
 */
export async function loadActiveAnnouncements(
  db: D1Database,
  klasse?: string | null,
): Promise<Announcement[]> {
  const rows = await db.prepare('SELECT * FROM announcements').all<Announcement>();
  const now = Date.now();

  return rows.results
    .filter((item) => !hasExpired(item, now))
    .filter((item) => !klasse || matchesClass(item.classes, klasse))
    .sort(byHighlightThenNewest);
}

/** Alle Ankündigungen inklusive abgelaufener (nur Adminbereich). */
export async function loadAllAnnouncements(db: D1Database): Promise<Announcement[]> {
  const rows = await db.prepare('SELECT * FROM announcements').all<Announcement>();
  return rows.results.sort(byHighlightThenNewest);
}
