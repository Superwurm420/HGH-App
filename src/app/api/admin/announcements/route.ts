import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { loadAllAnnouncements } from '@/server/services/announcements';
import { logAudit } from '@/server/services/audit';
import { Announcement } from '@/server/types';

export const dynamic = 'force-dynamic';

export interface AnnouncementInput {
  title?: string;
  body?: string;
  date?: string;
  expires?: string;
  audience?: string;
  classes?: string;
  highlight?: boolean;
}

/** GET /api/admin/announcements — alle Ankündigungen, auch abgelaufene. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/announcements', async ({ db }) => {
    return jsonResponse({ announcements: await loadAllAnnouncements(db) });
  });
}

/** POST /api/admin/announcements — neue Ankündigung anlegen. */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/announcements', async ({ db, auth }) => {
    const body = await readJsonBody<AnnouncementInput>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const title = body.title?.trim();
    const date = body.date?.trim();
    if (!title) return errorResponse('Titel ist erforderlich.', 400);
    if (!date) return errorResponse('Datum ist erforderlich.', 400);

    const created = await db.prepare(
      `INSERT INTO announcements (title, body, date, expires, audience, classes, highlight, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      title,
      (body.body ?? '').trim(),
      date,
      (body.expires ?? '').trim() || null,
      (body.audience ?? 'alle').trim(),
      (body.classes ?? '').trim(),
      body.highlight ? 1 : 0,
      auth.userId,
    ).first<Announcement>();

    await logAudit(db, auth.userId, 'create', 'announcement', created?.id, `Ankündigung: ${title}`);

    return jsonResponse(created, 201);
  });
}
