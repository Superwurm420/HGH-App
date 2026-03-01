import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/admin/auth';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return response;
}
