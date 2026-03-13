import { Env, AuthContext } from '../types';
import { errorResponse } from '../router';

export const COOKIE_NAME = 'hgh-admin';

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

/**
 * Prüft ob der Request eine gültige Admin-Session hat.
 * Gibt AuthContext bei Erfolg oder eine 401 Response bei Fehler zurück.
 */
export async function requireAuth(request: Request, env: Env): Promise<AuthContext | Response> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return errorResponse('Nicht authentifiziert.', 401);
  }

  const session = await env.DB.prepare(
    'SELECT s.id, s.user_id, s.expires_at, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).bind(token).first<{ id: string; user_id: string; expires_at: string; username: string }>();

  if (!session) {
    return errorResponse('Ungültige Session.', 401);
  }

  const now = new Date().toISOString();
  if (session.expires_at < now) {
    // Session abgelaufen, aufräumen
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
    return errorResponse('Session abgelaufen.', 401);
  }

  return { userId: session.user_id, username: session.username };
}

/**
 * Extrahiert den Auth-Kontext falls vorhanden (für optionale Auth).
 */
export async function getOptionalAuth(request: Request, env: Env): Promise<AuthContext | null> {
  const result = await requireAuth(request, env);
  if (result instanceof Response) return null;
  return result;
}
