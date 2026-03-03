import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSessionToken, getAdminSessionMaxAgeSeconds, isValidAdminPassword, isValidAdminUser } from '@/lib/admin/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as { username?: string; password?: string };
  const username = payload?.username?.trim() ?? '';
  const password = payload?.password?.trim() ?? '';

  if (!isValidAdminUser(username) || !isValidAdminPassword(password)) {
    return NextResponse.json({ error: 'Benutzername oder Passwort ist falsch.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: createAdminSessionToken(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getAdminSessionMaxAgeSeconds(),
  });

  return response;
}
