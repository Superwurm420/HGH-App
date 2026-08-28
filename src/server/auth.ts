import { cookies } from 'next/headers';

import { AuthContext } from './types';
import { errorResponse } from './responses';
import { hashPassword, verifyPassword } from './services/password';
import { logAudit } from './services/audit';
import { adminUsername } from './env';

export const COOKIE_NAME = 'hgh-admin';

/** Sessions laufen nach 12 Stunden ab. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Setzt das Session-Cookie auf einer Response.
 *
 * Frontend und API laufen im selben Worker, also auf derselben Origin — das
 * Cookie braucht weder SameSite=None noch eine CORS-Sonderbehandlung.
 * `Secure` nur über HTTPS, damit die lokale Entwicklung auf http funktioniert.
 */
export function withSessionCookie(response: Response, request: Request, token: string, maxAge: number): Response {
  const isSecure = new URL(request.url).protocol === 'https:';
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (isSecure) parts.push('Secure');

  const result = new Response(response.body, response);
  result.headers.set('Set-Cookie', parts.join('; '));
  return result;
}

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  username: string;
}

async function findSession(db: D1Database, token: string): Promise<SessionRow | null> {
  return db.prepare(
    `SELECT s.id, s.user_id, s.expires_at, u.username
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).bind(token).first<SessionRow>();
}

/** Liest den aktuellen Anmeldezustand, ohne einen Fehler zu erzwingen. */
export async function getAuth(db: D1Database): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await findSession(db, token);
  if (!session) return null;

  if (session.expires_at < new Date().toISOString()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
    return null;
  }

  return { userId: session.user_id, username: session.username };
}

/**
 * Verlangt eine gültige Admin-Session.
 * Gibt bei Erfolg den AuthContext zurück, sonst eine fertige 401-Response.
 */
export async function requireAuth(db: D1Database): Promise<AuthContext | Response> {
  const auth = await getAuth(db);
  if (!auth) {
    return errorResponse('Nicht angemeldet.', 401);
  }
  return auth;
}

/** Legt eine neue Session an und räumt dabei abgelaufene auf. */
export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await db.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).bind(userId, token, expiresAt).run();

  await db.prepare(
    'DELETE FROM sessions WHERE expires_at < ?'
  ).bind(new Date().toISOString()).run();

  return token;
}

/** Beendet die Session zum übergebenen Token. */
export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export interface LoginResult {
  ok: boolean;
  userId?: string;
  username?: string;
}

/**
 * Prüft die Anmeldedaten.
 *
 * Ersteinrichtung: Solange noch kein Benutzer existiert, legt der erste Login
 * mit ADMIN_USER/ADMIN_PASSWORD das Admin-Konto an.
 */
export async function authenticate(
  env: CloudflareEnv,
  username: string,
  password: string,
): Promise<LoginResult> {
  const db = env.DB;

  const user = await db.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?'
  ).bind(username).first<{ id: string; username: string; password_hash: string }>();

  if (user) {
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logAudit(db, null, 'login_failed', 'user', user.id, `Fehlgeschlagener Login für ${username}`);
      return { ok: false };
    }
    return { ok: true, userId: user.id, username: user.username };
  }

  const created = await tryInitialSetup(env, username, password);
  if (!created) return { ok: false };
  return { ok: true, userId: created.id, username: created.username };
}

/** Legt den ersten Admin-Benutzer an, wenn die Zugangsdaten zur Konfiguration passen. */
async function tryInitialSetup(
  env: CloudflareEnv,
  username: string,
  password: string,
): Promise<{ id: string; username: string } | null> {
  const expectedPassword = env.ADMIN_PASSWORD;
  if (!expectedPassword) return null;
  if (username !== adminUsername(env) || password !== expectedPassword) return null;

  const count = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM users').first<{ cnt: number }>();
  if ((count?.cnt ?? 0) > 0) return null;

  const passwordHash = await hashPassword(password);
  const created = await env.DB.prepare(
    `INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin') RETURNING id, username`
  ).bind(username, passwordHash).first<{ id: string; username: string }>();

  if (created) {
    console.log(`[auth] Erster Admin-Benutzer '${username}' wurde angelegt.`);
  }
  return created;
}
