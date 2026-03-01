import crypto from 'node:crypto';

export const ADMIN_PASSWORD = 'hgh-admin-2026';
export const ADMIN_COOKIE_NAME = 'hgh_admin_session';

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createSessionSignature(): string {
  return crypto.createHash('sha256').update(`hgh-admin:${ADMIN_PASSWORD}`).digest('hex');
}

export function isValidAdminPassword(input: string): boolean {
  return secureCompare(input, ADMIN_PASSWORD);
}

export function createAdminSessionToken(): string {
  return createSessionSignature();
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  return secureCompare(token, createSessionSignature());
}
