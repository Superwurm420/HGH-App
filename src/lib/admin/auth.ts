import crypto from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'hgh-admin';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const SESSION_CLOCK_SKEW_SECONDS = 30;

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || 'hgh-admin';
}

function getAdminUser(): string {
  return process.env.ADMIN_USER?.trim() || 'redaktion';
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || getAdminPassword();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
}

export function isValidAdminPassword(input: string): boolean {
  return secureCompare(input, getAdminPassword());
}

export function isValidAdminUser(input: string): boolean {
  return secureCompare(input, getAdminUser());
}

export function createAdminSessionToken(now: Date = new Date()): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${nonce}.${exp}`;
  const signature = sign(payload);
  return `${base64UrlEncode(payload)}.${signature}`;
}

export function isValidAdminSessionToken(token: string | undefined, now: Date = new Date()): boolean {
  if (!token) return false;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return false;

  let payload: string;
  try {
    payload = base64UrlDecode(encodedPayload);
  } catch {
    return false;
  }

  const payloadParts = payload.split('.');
  if (payloadParts.length !== 2) return false;
  const exp = Number(payloadParts[1]);
  if (!Number.isFinite(exp)) return false;

  const expectedSignature = sign(payload);
  if (!secureCompare(signature, expectedSignature)) return false;

  const nowSeconds = Math.floor(now.getTime() / 1000);
  return exp + SESSION_CLOCK_SKEW_SECONDS >= nowSeconds;
}

export function getAdminSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}
