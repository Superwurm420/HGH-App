import { Env } from '../../types';
import { jsonResponse, errorResponse } from '../../router';
import { hashPassword, verifyPassword } from '../../services/password';
import { logAudit } from '../../services/audit';

const COOKIE_NAME = 'hgh-admin';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 Stunden

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

/**
 * POST /api/admin/login
 * Body: { username, password }
 */
export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungültiger Request-Body.', 400);
  }

  const { username, password } = body;
  if (!username || !password) {
    return errorResponse('Benutzername und Passwort erforderlich.', 400);
  }

  // User in DB suchen
  const user = await env.DB.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?'
  ).bind(username).first<{ id: string; username: string; password_hash: string }>();

  if (!user) {
    // Auto-Setup: Wenn noch kein User existiert und die Env-Variablen passen, User anlegen
    const isInitialSetup = await tryInitialSetup(env, username, password);
    if (!isInitialSetup) {
      return errorResponse('Ungültige Anmeldedaten.', 401);
    }
    // Nochmal versuchen
    return handleAdminLogin(request, env);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    await logAudit(env, null, 'login_failed', 'user', user.id, `Fehlgeschlagener Login für ${username}`);
    return errorResponse('Ungültige Anmeldedaten.', 401);
  }

  // Session erstellen
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).bind(user.id, token, expiresAt).run();

  // Alte abgelaufene Sessions aufräumen
  await env.DB.prepare(
    'DELETE FROM sessions WHERE expires_at < ?'
  ).bind(new Date().toISOString()).run();

  await logAudit(env, user.id, 'login', 'user', user.id);

  const isSecure = new URL(request.url).protocol === 'https:';
  const securePart = isSecure ? ' Secure;' : '';

  const response = jsonResponse({ ok: true, username: user.username });
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly;${securePart} SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`
  );
  return newResponse;
}

/**
 * Auto-Setup: Erstellt den ersten Admin-User aus den Umgebungsvariablen.
 */
async function tryInitialSetup(env: Env, username: string, password: string): Promise<boolean> {
  const expectedUser = env.ADMIN_USER || 'redaktion';
  const expectedPass = env.ADMIN_PASSWORD;

  if (!expectedPass) return false;
  if (username !== expectedUser || password !== expectedPass) return false;

  // Prüfen ob überhaupt User existieren
  const count = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>();
  if (count && count.cnt > 0) return false;

  // Ersten Admin anlegen
  const hash = await hashPassword(password);
  await env.DB.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).bind(username, hash, 'admin').run();

  console.log(`[auth] Erster Admin-User '${username}' wurde automatisch erstellt.`);
  return true;
}

/**
 * POST /api/admin/logout
 */
export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[COOKIE_NAME];

  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  const isSecure = new URL(request.url).protocol === 'https:';
  const securePart = isSecure ? ' Secure;' : '';

  const response = jsonResponse({ ok: true });
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly;${securePart} SameSite=Lax; Max-Age=0`
  );
  return newResponse;
}

/**
 * GET /api/admin/session
 * Prüft ob die aktuelle Session gültig ist.
 */
export async function handleAdminSession(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return jsonResponse({ authenticated: false });
  }

  const session = await env.DB.prepare(
    'SELECT s.id, s.expires_at, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).bind(token).first<{ id: string; expires_at: string; username: string }>();

  if (!session || session.expires_at < new Date().toISOString()) {
    if (session) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
    }
    return jsonResponse({ authenticated: false });
  }

  return jsonResponse({ authenticated: true, username: session.username });
}
