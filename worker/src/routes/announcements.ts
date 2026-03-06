import { Env, Announcement } from '../types';
import { jsonResponse, errorResponse } from '../router';

/**
 * GET /api/announcements?klasse=HT11
 * Liefert aktive Ankündigungen, optional gefiltert nach Klasse.
 */
export async function handleAnnouncements(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const klasse = url.searchParams.get('klasse');

  const now = new Date().toISOString();
  const rows = await env.DB.prepare(
    'SELECT * FROM announcements WHERE (expires IS NULL OR expires = \'\' OR expires > ?) ORDER BY date DESC'
  ).bind(now).all<Announcement>();

  let announcements = rows.results;

  // Filtern nach Klasse falls angegeben
  if (klasse) {
    announcements = announcements.filter((a) => {
      if (a.audience === 'alle' && !a.classes) return true;
      if (!a.classes) return true;
      const classCodes = a.classes.split(',').map((c) => c.trim().toUpperCase());
      return classCodes.includes(klasse.toUpperCase());
    });
  }

  return jsonResponse({ announcements });
}

/**
 * GET /api/announcements/:id
 */
export async function handleAnnouncementById(request: Request, env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT * FROM announcements WHERE id = ?'
  ).bind(id).first<Announcement>();

  if (!row) {
    return errorResponse('Ankündigung nicht gefunden.', 404);
  }

  return jsonResponse(row);
}
