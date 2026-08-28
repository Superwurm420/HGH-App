/**
 * Einheitliche JSON-Antworten für alle Route Handlers.
 *
 * Fehlertexte sind deutsch — sie werden im Adminbereich direkt angezeigt.
 */

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

/**
 * `detail` ist die technische Ursache in Klartext. Sie steht nur in Antworten
 * hinter `withAdmin()`, wird also ausschließlich einem angemeldeten Admin
 * gezeigt — und erspart eine Deploy-Runde, wenn eine Meldung allein nicht
 * verrät, woran es lag.
 */
export function errorResponse(message: string, status = 400, detail?: string): Response {
  return jsonResponse(detail ? { error: message, detail } : { error: message }, status);
}

/** Kurzfassung eines unbekannten Fehlers für das `detail`-Feld. */
export function describeError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.slice(0, 300);
}

/**
 * Führt einen Handler aus und übersetzt unerwartete Fehler in eine 500.
 * Ohne das würde ein DB-Fehler als HTML-Fehlerseite von Next.js zurückkommen,
 * die der API-Client nicht parsen kann.
 */
export async function withErrorHandling(
  label: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error(`[api] Fehler in ${label}:`, error);
    return errorResponse('Interner Serverfehler.', 500);
  }
}

/** Liest den JSON-Body oder gibt null zurück, wenn er ungültig ist. */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
