import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthConfigured, isValidBasicAuth } from '@/lib/admin/auth';

function unauthorizedResponse(): NextResponse {
  return new NextResponse('Admin-Zugang verweigert.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="HGH Admin"',
    },
  });
}

function missingConfigResponse(): NextResponse {
  return new NextResponse('Admin-Zugang nicht konfiguriert. Bitte ADMIN_USER und ADMIN_PASSWORD setzen.', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!isAdminPath) return NextResponse.next();
  if (!isAdminAuthConfigured()) return missingConfigResponse();

  const authHeader = request.headers.get('authorization');
  if (!isValidBasicAuth(authHeader)) return unauthorizedResponse();

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
