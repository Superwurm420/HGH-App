import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidAdminSessionToken } from './src/lib/admin/auth';

function unauthorizedApiResponse(): NextResponse {
  return NextResponse.json({ error: 'Admin-Zugang verweigert.' }, { status: 401 });
}

function unauthorizedPageResponse(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/', request.url));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAdminApiPath = pathname.startsWith('/api/admin');
  const isAdminPagePath = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdminApiPath && pathname !== '/api/admin/login' && pathname !== '/api/admin/session') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!isValidAdminSessionToken(token)) return unauthorizedApiResponse();
  }

  if (isAdminPagePath) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!isValidAdminSessionToken(token)) return unauthorizedPageResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
