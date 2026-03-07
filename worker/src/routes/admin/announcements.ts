import { Env, Announcement } from '../../types';
import { jsonResponse, errorResponse } from '../../router';
import { logAudit } from '../../services/audit';
import { requireAuth } from '../../middleware/auth';

/**
 * GET /api/admin/announcements - Alle Ankündigungen (auch abgelaufene)
 * POST /api/admin/announcements - Neue Ankündigung anlegen
 */
export async function handleAdminAnnouncements(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM announcements ORDER BY date DESC'
    ).all<Announcement>();
    return jsonResponse({ announcements: rows.results });
  }

  if (request.method === 'POST') {
    let body: {
      title?: string;
      body?: string;
      date?: string;
      expires?: string;
      audience?: string;
      classes?: string;
      highlight?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Ungültiger Request-Body.', 400);
    }

    if (!body.title?.trim()) {
      return errorResponse('Titel ist erforderlich.', 400);
    }
    if (!body.date?.trim()) {
      return errorResponse('Datum ist erforderlich.', 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO announcements (title, body, date, expires, audience, classes, highlight, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      body.title.trim(),
      (body.body ?? '').trim(),
      body.date.trim(),
      (body.expires ?? '').trim() || null,
      (body.audience ?? 'alle').trim(),
      (body.classes ?? '').trim(),
      body.highlight ? 1 : 0,
      auth.userId,
    ).first<Announcement>();

    await logAudit(env, auth.userId, 'create', 'announcement', result?.id, `Ankündigung: ${body.title}`);

    return jsonResponse(result, 201);
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}

/**
 * PUT /api/admin/announcements/:id - Ankündigung bearbeiten
 * DELETE /api/admin/announcements/:id - Ankündigung löschen
 */
export async function handleAdminAnnouncementById(request: Request, env: Env, id: string): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (auth instanceof Response) return auth;

  if (request.method === 'PUT') {
    let body: {
      title?: string;
      body?: string;
      date?: string;
      expires?: string;
      audience?: string;
      classes?: string;
      highlight?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse('Ungültiger Request-Body.', 400);
    }

    if (!body.title?.trim()) {
      return errorResponse('Titel ist erforderlich.', 400);
    }

    const result = await env.DB.prepare(
      `UPDATE announcements SET
         title = ?, body = ?, date = ?, expires = ?, audience = ?, classes = ?, highlight = ?,
         updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    ).bind(
      body.title.trim(),
      (body.body ?? '').trim(),
      (body.date ?? '').trim(),
      (body.expires ?? '').trim() || null,
      (body.audience ?? 'alle').trim(),
      (body.classes ?? '').trim(),
      body.highlight ? 1 : 0,
      id,
    ).first<Announcement>();

    if (!result) {
      return errorResponse('Ankündigung nicht gefunden.', 404);
    }

    await logAudit(env, auth.userId, 'update', 'announcement', id, `Ankündigung bearbeitet: ${body.title}`);

    return jsonResponse(result);
  }

  if (request.method === 'DELETE') {
    const existing = await env.DB.prepare(
      'SELECT title FROM announcements WHERE id = ?'
    ).bind(id).first<{ title: string }>();

    if (!existing) {
      return errorResponse('Ankündigung nicht gefunden.', 404);
    }

    await env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();

    await logAudit(env, auth.userId, 'delete', 'announcement', id, `Ankündigung gelöscht: ${existing.title}`);

    return jsonResponse({ ok: true, deleted: id });
  }

  return errorResponse('Methode nicht erlaubt.', 405);
}
