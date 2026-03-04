import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge-Runtime-kompatible Middleware für Admin-API-Routen.
 *
 * Da die Middleware in der Edge Runtime läuft, kann kein `node:crypto` verwendet
 * werden. Die Token-Validierung nutzt stattdessen die Web Crypto API (SubtleCrypto).
 * Die Konstanten und Logik entsprechen exakt src/lib/admin/auth.ts.
 */

const ADMIN_COOKIE_NAME = 'hgh-admin';
const SESSION_CLOCK_SKEW_SECONDS = 30;

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || 'hgh-admin';
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const dotIndex = token.indexOf('.');
  if (dotIndex < 0) return false;
  const encodedPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
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

  const expectedSignature = await hmacSha256Hex(getSessionSecret(), payload);
  if (!constantTimeEqual(signature, expectedSignature)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp + SESSION_CLOCK_SKEW_SECONDS >= nowSeconds;
}

function unauthorizedApiResponse(): NextResponse {
  return NextResponse.json({ error: 'Admin-Zugang verweigert.' }, { status: 401 });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname !== '/api/admin/login' && pathname !== '/api/admin/session') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!(await isValidSessionToken(token))) return unauthorizedApiResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
