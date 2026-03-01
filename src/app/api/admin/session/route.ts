import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidAdminSessionToken } from '@/lib/admin/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return NextResponse.json({ authenticated: isValidAdminSessionToken(token) });
}
