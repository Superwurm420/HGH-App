import { Env, EventRecord } from '../types';
import { jsonResponse, errorResponse } from '../router';

/**
 * GET /api/events?klasse=HT11
 * Liefert aktive Termine, optional gefiltert nach Klasse.
 */
export async function handleEvents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const klasse = url.searchParams.get('klasse');

  const now = new Date().toISOString().split('T')[0];
  const rows = await env.DB.prepare(
    'SELECT * FROM events WHERE (end_date IS NULL OR end_date >= ?) ORDER BY start_date ASC'
  ).bind(now).all<EventRecord>();

  let events = rows.results;

  if (klasse) {
    events = events.filter((e) => {
      if (!e.classes) return true;
      const classCodes = e.classes.split(',').map((c) => c.trim().toUpperCase());
      return classCodes.length === 0 || classCodes.includes(klasse.toUpperCase());
    });
  }

  return jsonResponse({ events });
}

/**
 * GET /api/events/:id
 */
export async function handleEventById(request: Request, env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first<EventRecord>();

  if (!row) {
    return errorResponse('Termin nicht gefunden.', 404);
  }

  return jsonResponse(row);
}
