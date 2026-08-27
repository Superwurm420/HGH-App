import { withAdmin } from '@/server/guard';
import { errorResponse, jsonResponse, readJsonBody } from '@/server/responses';
import { logAudit } from '@/server/services/audit';
import { loadAllEvents } from '@/server/services/events';
import { EventRecord } from '@/server/types';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['general', 'exam', 'holiday', 'project', 'other'] as const;

export interface EventInput {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  category?: string;
  classes?: string;
}

/**
 * Die Spalte `category` hat einen CHECK-Constraint. Ein unbekannter Wert würde
 * D1 sonst mit einem SQL-Fehler quittieren statt mit einer lesbaren Meldung.
 */
export function normalizeCategory(value: string | undefined): string | null {
  const category = (value ?? 'general').trim();
  return (CATEGORIES as readonly string[]).includes(category) ? category : null;
}

/** GET /api/admin/events — alle Termine, auch vergangene. */
export async function GET(): Promise<Response> {
  return withAdmin('GET /api/admin/events', async ({ db }) => {
    return jsonResponse({ events: await loadAllEvents(db) });
  });
}

/** POST /api/admin/events — neuen Termin anlegen. */
export async function POST(request: Request): Promise<Response> {
  return withAdmin('POST /api/admin/events', async ({ db, auth }) => {
    const body = await readJsonBody<EventInput>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const title = body.title?.trim();
    const startDate = body.start_date?.trim();
    if (!title) return errorResponse('Titel ist erforderlich.', 400);
    if (!startDate) return errorResponse('Startdatum ist erforderlich.', 400);

    const category = normalizeCategory(body.category);
    if (!category) return errorResponse('Unbekannte Kategorie.', 400);

    const created = await db.prepare(
      `INSERT INTO events (title, description, start_date, end_date, all_day, category, classes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      title,
      (body.description ?? '').trim(),
      startDate,
      (body.end_date ?? '').trim() || null,
      body.all_day === false ? 0 : 1,
      category,
      (body.classes ?? '').trim(),
      auth.userId,
    ).first<EventRecord>();

    await logAudit(db, auth.userId, 'create', 'event', created?.id, `Termin: ${title}`);

    return jsonResponse(created, 201);
  });
}
