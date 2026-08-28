import { cookies } from 'next/headers';

import { AuthContext } from './types';
import { errorResponse } from './responses';
import { hashPassword, verifyPassword } from './services/password';
import { logAudit } from './services/audit';
import { adminUsername } from './env';
import { DEFAULT_ADMIN_PASSWORD } from '@/lib/admin-defaults';

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

/**
 * Ein leerer `password_hash` bedeutet: für dieses Konto ist noch kein Passwort
 * vergeben.
 *
 * Das ist bewusst dieselbe Spalte statt eines zusätzlichen Kennzeichens — zwei
 * Felder könnten auseinanderlaufen, dieses eine nicht. Sicher ist der leere
 * Wert, weil `verifyPassword` ohne den Trenner `:` sofort `false` liefert: Ein
 * leerer Hash kann durch kein Passwort der Welt bestätigt werden.
 */
export function hasPassword(passwordHash: string): boolean {
  return passwordHash.length > 0;
}

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  username: string;
  password_hash: string;
}

async function findSession(db: D1Database, token: string): Promise<SessionRow | null> {
  return db.prepare(
    `SELECT s.id, s.user_id, s.expires_at, u.username, u.password_hash
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

  return {
    userId: session.user_id,
    username: session.username,
    mustSetPassword: !hasPassword(session.password_hash),
  };
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
  /** Das Konto hat noch kein Passwort — es muss jetzt eines vergeben werden. */
  mustSetPassword?: boolean;
}

/**
 * Prüft die Anmeldedaten.
 *
 * Ersteinrichtung: Solange noch kein Benutzer existiert, legt der erste Login
 * mit dem konfigurierten ADMIN_USER und dem Standardpasswort das Admin-Konto
 * an — noch ohne eigenes Passwort. Das vergibt die Redaktion unmittelbar
 * danach selbst; bis dahin lässt `withAdmin` nichts anderes zu als genau
 * diesen einen Schritt.
 *
 * Der Benutzername wird ohne Rücksicht auf Groß- und Kleinschreibung gesucht
 * (`COLLATE NOCASE`). Dokumentiert ist `Admin`; wer `admin` tippt, soll nicht
 * vor einem „Ungültige Anmeldedaten" stehen, dessen Grund niemand sieht.
 */
export async function authenticate(
  env: CloudflareEnv,
  username: string,
  password: string,
): Promise<LoginResult> {
  const db = env.DB;

  const user = await db.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE'
  ).bind(username).first<{ id: string; username: string; password_hash: string }>();

  if (user) {
    // Konto ohne eigenes Passwort: Bis zur ersten Vergabe gilt weiter das
    // Standardpasswort. Gegen den leeren Hash zu prüfen ginge nicht — er ist
    // absichtlich unbestätigbar.
    if (!hasPassword(user.password_hash)) {
      if (password !== DEFAULT_ADMIN_PASSWORD) {
        await logAudit(db, null, 'login_failed', 'user', user.id, `Fehlgeschlagener Login für ${username}`);
        return { ok: false };
      }
      return { ok: true, userId: user.id, username: user.username, mustSetPassword: true };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logAudit(db, null, 'login_failed', 'user', user.id, `Fehlgeschlagener Login für ${username}`);
      return { ok: false };
    }
    return { ok: true, userId: user.id, username: user.username };
  }

  const created = await tryInitialSetup(env, username, password);
  if (!created) return { ok: false };
  return { ok: true, userId: created.id, username: created.username, mustSetPassword: true };
}

/**
 * Legt bei der Ersteinrichtung das Admin-Konto an.
 *
 * Verlangt den konfigurierten Benutzernamen (ohne Rücksicht auf Groß- und
 * Kleinschreibung) und das Standardpasswort. Das Konto entsteht mit leerem
 * `password_hash`, also ohne eigenes Passwort — vergeben wird es im
 * Adminbereich, erzwungen durch `withAdmin`.
 *
 * Angelegt wird unter dem konfigurierten Namen, nicht unter dem eingetippten:
 * Sonst hinge die Schreibweise des Kontos davon ab, wie jemand sich zufällig
 * zuerst angemeldet hat.
 *
 * Greift ausschließlich, solange die Tabelle leer ist — mit dem ersten Konto
 * ist dieser Weg dauerhaft zu.
 */
async function tryInitialSetup(
  env: CloudflareEnv,
  username: string,
  password: string,
): Promise<{ id: string; username: string } | null> {
  const configured = adminUsername(env);
  if (username.toLowerCase() !== configured.toLowerCase()) return null;
  if (password !== DEFAULT_ADMIN_PASSWORD) return null;

  const count = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM users').first<{ cnt: number }>();
  if ((count?.cnt ?? 0) > 0) return null;

  const created = await env.DB.prepare(
    `INSERT INTO users (username, password_hash, role) VALUES (?, '', 'admin') RETURNING id, username`
  ).bind(configured).first<{ id: string; username: string }>();

  if (created) {
    console.log(`[auth] Erster Admin-Benutzer '${configured}' wurde angelegt (noch mit Standardpasswort).`);
    await logAudit(
      env.DB,
      created.id,
      'initial_setup',
      'user',
      created.id,
      `Admin-Konto '${configured}' bei der Ersteinrichtung angelegt`,
    );
  }
  return created;
}

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; reason: 'leer' | 'unveraendert' | 'falsches-passwort' | 'kein-konto' };

/**
 * Prüft ein neues Passwort, bevor es gehasht wird.
 * Als eigene Funktion, damit die Regeln ohne Datenbank testbar sind.
 *
 * Es gibt bewusst **keine** Mindestlänge — die Länge bestimmt die Redaktion.
 * Leer bleibt trotzdem unzulässig: Ein leeres Passwort wäre kein Passwort,
 * sondern der passwortlose Zustand der Ersteinrichtung, und das Konto stünde
 * dauerhaft offen.
 *
 * `current` ist bei der Erstvergabe der leere String; dann entfällt der
 * Vergleich, denn es gibt kein bisheriges Passwort.
 */
export function validateNewPassword(
  current: string,
  next: string,
): { ok: true } | { ok: false; reason: 'leer' | 'unveraendert' } {
  if (next.length === 0) return { ok: false, reason: 'leer' };
  if (current.length > 0 && next === current) return { ok: false, reason: 'unveraendert' };
  return { ok: true };
}

/**
 * Setzt das Passwort des angemeldeten Benutzers — die Erstvergabe nach der
 * Ersteinrichtung genauso wie jeden späteren Wechsel.
 *
 * Hat das Konto bereits ein Passwort, muss das bisherige stimmen. Hat es noch
 * keines (Ersteinrichtung), entfällt diese Prüfung: Es gäbe nichts, wogegen
 * geprüft werden könnte, und der Weg ist ohnehin nur über eine bereits gültige
 * Sitzung erreichbar.
 *
 * Alle übrigen Sitzungen des Benutzers werden beendet: Wer das alte Passwort
 * kannte — oder das Konto in seinem passwortlosen Fenster erwischt hat — soll
 * nicht über ein offenes Fenster angemeldet bleiben.
 */
export async function changePassword(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepToken?: string,
): Promise<PasswordChangeResult> {
  const user = await db.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(userId).first<{ password_hash: string }>();

  if (!user) return { ok: false, reason: 'kein-konto' };

  const needsCurrent = hasPassword(user.password_hash);

  const check = validateNewPassword(needsCurrent ? currentPassword : '', newPassword);
  if (!check.ok) return { ok: false, reason: check.reason };

  if (needsCurrent && !(await verifyPassword(currentPassword, user.password_hash))) {
    return { ok: false, reason: 'falsches-passwort' };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(passwordHash, userId).run();

  if (keepToken) {
    await db.prepare(
      'DELETE FROM sessions WHERE user_id = ? AND token != ?'
    ).bind(userId, keepToken).run();
  } else {
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  }

  return { ok: true };
}
