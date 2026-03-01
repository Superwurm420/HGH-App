import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidAdminSessionToken } from '@/lib/admin/auth';

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Admin-Zugang verweigert.' }, { status: 401 });
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAdminApiPath = pathname.startsWith('/api/admin');

  if (!isAdminApiPath || pathname === '/api/admin/login' || pathname === '/api/admin/session') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSessionToken(token)) return unauthorizedResponse();

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
