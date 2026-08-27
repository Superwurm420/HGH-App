import { EventRecord } from '../types';
import { matchesClass } from './announcements';

/**
 * Lädt alle Termine, die noch nicht vorbei sind, optional für eine Klasse.
 * Ein Termin ohne Enddatum gilt am Starttag als laufend.
 */
export async function loadActiveEvents(
  db: D1Database,
  klasse?: string | null,
): Promise<EventRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.prepare(
    `SELECT * FROM events
     WHERE COALESCE(NULLIF(end_date, ''), start_date) >= ?
     ORDER BY start_date ASC`
  ).bind(today).all<EventRecord>();

  if (!klasse) return rows.results;
  return rows.results.filter((item) => matchesClass(item.classes, klasse));
}

/** Alle Termine inklusive vergangener (nur Adminbereich). */
export async function loadAllEvents(db: D1Database): Promise<EventRecord[]> {
  const rows = await db.prepare(
    'SELECT * FROM events ORDER BY start_date ASC'
  ).all<EventRecord>();
  return rows.results;
}
