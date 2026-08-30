import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/lib/feedback';
import { FeedbackRecord } from '../types';

/**
 * Rückmeldungen aus der App.
 *
 * Der Weg hinein ist der einzige öffentliche Schreibzugriff auf die Datenbank:
 * `POST /api/feedback` steht ohne Anmeldung offen. Deshalb wird hier alles
 * geprüft, was hineingeht — Länge, Kategorie, Menge —, und nichts davon steckt
 * in der Oberfläche, die sich umgehen lässt.
 */

export const MESSAGE_MAX = 2000;
const CONTACT_MAX = 200;
const KLASSE_MAX = 20;
const PAGE_MAX = 200;

export interface FeedbackInput {
  message?: string;
  category?: string;
  contact?: string;
  klasse?: string;
  page?: string;
}

/** Geprüfte Rückmeldung, so wie sie in die Datenbank geht. */
export interface CleanFeedback {
  message: string;
  category: FeedbackCategory;
  contact: string;
  klasse: string;
  page: string;
}

/**
 * Prüft eine eingehende Rückmeldung.
 *
 * Gibt entweder die bereinigten Werte zurück oder einen deutschen Fehlertext —
 * der wird im Formular unverändert angezeigt.
 */
export function validateFeedback(input: FeedbackInput): { ok: true; value: CleanFeedback } | { ok: false; error: string } {
  const message = (input.message ?? '').trim();
  if (!message) return { ok: false, error: 'Bitte schreib etwas in das Feld.' };
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: `Die Rückmeldung ist zu lang (höchstens ${MESSAGE_MAX} Zeichen).` };
  }

  const category = (input.category ?? 'other').trim();
  if (!(FEEDBACK_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: 'Unbekannte Kategorie.' };
  }

  const contact = (input.contact ?? '').trim();
  if (contact.length > CONTACT_MAX) return { ok: false, error: 'Die Kontaktangabe ist zu lang.' };

  const klasse = (input.klasse ?? '').trim().toUpperCase();
  if (klasse.length > KLASSE_MAX) return { ok: false, error: 'Die Klassenangabe ist zu lang.' };

  return {
    ok: true,
    value: {
      message,
      category: category as FeedbackCategory,
      contact,
      klasse,
      // Die Seite kommt aus dem Browser und wird nur gekürzt, nicht geprüft:
      // sie ist ein Hinweis für die Redaktion, keine Entscheidungsgrundlage.
      page: (input.page ?? '').trim().slice(0, PAGE_MAX),
    },
  };
}

/**
 * Schutz vor versehentlichem Fluten: Ein offener Endpunkt ohne Anmeldung
 * füllt sonst unbemerkt die Datenbank. Beides ist bewusst grob — es soll
 * Doppelklicks und Übermut bremsen, nicht Angriffe abwehren.
 */
const DUPLICATE_WINDOW_MINUTES = 10;
const HOURLY_LIMIT = 60;

export async function isDuplicate(db: D1Database, message: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 AS hit FROM feedback
     WHERE message = ? AND created_at >= datetime('now', ?)
     LIMIT 1`
  ).bind(message, `-${DUPLICATE_WINDOW_MINUTES} minutes`).first<{ hit: number }>();
  return row !== null;
}

export async function isOverHourlyLimit(db: D1Database): Promise<boolean> {
  const row = await db.prepare(
    `SELECT COUNT(*) AS total FROM feedback WHERE created_at >= datetime('now', '-1 hours')`
  ).first<{ total: number }>();
  return (row?.total ?? 0) >= HOURLY_LIMIT;
}

/** Legt eine geprüfte Rückmeldung an. */
export async function createFeedback(db: D1Database, value: CleanFeedback): Promise<FeedbackRecord | null> {
  return db.prepare(
    `INSERT INTO feedback (message, category, contact, klasse, page)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`
  ).bind(value.message, value.category, value.contact, value.klasse, value.page).first<FeedbackRecord>();
}

/** Alle Rückmeldungen, offene zuerst, darin die neuesten oben. */
export async function loadFeedback(db: D1Database): Promise<FeedbackRecord[]> {
  const rows = await db.prepare(
    `SELECT * FROM feedback
     ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC`
  ).all<FeedbackRecord>();
  return rows.results;
}
