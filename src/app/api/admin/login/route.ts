import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSessionToken, isValidAdminPassword } from '@/lib/admin/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as { password?: string };
  const password = payload?.password?.trim() ?? '';

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: 'Passwort ist falsch.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: createAdminSessionToken(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}
