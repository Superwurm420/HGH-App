import { getDb } from '@/server/env';
import { errorResponse, jsonResponse, readJsonBody, withErrorHandling } from '@/server/responses';
import {
  createFeedback,
  isDuplicate,
  isOverHourlyLimit,
  validateFeedback,
  type FeedbackInput,
} from '@/server/services/feedback';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feedback — Rückmeldung abgeben, ohne Anmeldung.
 *
 * Antwortet bewusst nur mit `{ ok: true }`: Was gespeichert wurde, geht die
 * Öffentlichkeit nichts an, gelesen wird ausschließlich im Adminbereich.
 */
export async function POST(request: Request): Promise<Response> {
  return withErrorHandling('POST /api/feedback', async () => {
    const body = await readJsonBody<FeedbackInput>(request);
    if (!body) return errorResponse('Ungültiger Request-Body.', 400);

    const checked = validateFeedback(body);
    if (!checked.ok) return errorResponse(checked.error, 400);

    const db = await getDb();

    if (await isDuplicate(db, checked.value.message)) {
      // Fast immer ein doppelter Klick — deshalb kein Fehler, sondern der
      // gewohnte Erfolg. Zweimal dasselbe zu speichern nützt niemandem.
      return jsonResponse({ ok: true });
    }

    if (await isOverHourlyLimit(db)) {
      return errorResponse('Gerade kommen sehr viele Rückmeldungen an. Bitte später noch einmal.', 429);
    }

    await createFeedback(db, checked.value);

    return jsonResponse({ ok: true }, 201);
  });
}
