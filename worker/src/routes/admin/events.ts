import { Env, EventRecord } from '../../types';
import { jsonResponse, errorResponse } from '../../router';
import { logAudit } from '../../services/audit';
import { requireAuth } from '../../middleware/auth';

/**
 * GET/POST /api/admin/events
 */
export async function handleAdminEvents(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM events ORDER BY start_date ASC'
    ).all<EventRecord>();
    return jsonResponse({ events: rows.results });
  }

  if (request.method === 'POST') {
    let body: {
      title?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      all_day?: boolean;
      category?: string;
      classes?: string;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Ungültiger Request-Body.', 400);
    }

    if (!body.title?.trim()) {
      return errorResponse('Titel ist erforderlich.', 400);
    }
    if (!body.start_date?.trim()) {
      return errorResponse('Startdatum ist erforderlich.', 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO events (title, description, start_date, end_date, all_day, category, classes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      body.title.trim(),
      (body.description ?? '').trim(),
      body.start_date.trim(),
      (body.end_date ?? '').trim() || null,
      body.all_day !== false ? 1 : 0,
      (body.category ?? 'general').trim(),
      (body.classes ?? '').trim(),
      auth.userId,
    ).first<EventRecord>();

    await logAudit(env, auth.userId, 'create', 'event', result?.id, `Termin: ${body.title}`);

    return jsonResponse(result, 201);
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}

/**
 * PUT/DELETE /api/admin/events/:id
 */
export async function handleAdminEventById(request: Request, env: Env, id: string): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'PUT') {
    let body: {
      title?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      all_day?: boolean;
      category?: string;
      classes?: string;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Ungültiger Request-Body.', 400);
    }

    if (!body.title?.trim()) {
      return errorResponse('Titel ist erforderlich.', 400);
    }
    if (!body.start_date?.trim()) {
      return errorResponse('Startdatum ist erforderlich.', 400);
    }

    const result = await env.DB.prepare(
      `UPDATE events SET
         title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?, category = ?, classes = ?,
         updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    ).bind(
      (body.title ?? '').trim(),
      (body.description ?? '').trim(),
      (body.start_date ?? '').trim(),
      (body.end_date ?? '').trim() || null,
      body.all_day !== false ? 1 : 0,
      (body.category ?? 'general').trim(),
      (body.classes ?? '').trim(),
      id,
    ).first<EventRecord>();

    if (!result) {
      return errorResponse('Termin nicht gefunden.', 404);
    }

    await logAudit(env, auth.userId, 'update', 'event', id, `Termin bearbeitet: ${body.title}`);

    return jsonResponse(result);
  }

  if (request.method === 'DELETE') {
    const existing = await env.DB.prepare(
      'SELECT title FROM events WHERE id = ?'
    ).bind(id).first<{ title: string }>();

    if (!existing) {
      return errorResponse('Termin nicht gefunden.', 404);
    }

    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

    await logAudit(env, auth.userId, 'delete', 'event', id, `Termin gelöscht: ${existing.title}`);

    return jsonResponse({ ok: true, deleted: id });
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}
