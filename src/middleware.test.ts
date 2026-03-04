import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from './lib/admin/auth';

describe('admin API middleware', () => {
  it('allows admin API requests with a valid session cookie', async () => {
    const token = createAdminSessionToken();
    const request = new NextRequest('http://localhost/api/admin/announcements', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it('returns 401 for admin API requests without a session cookie', async () => {
    const request = new NextRequest('http://localhost/api/admin/announcements');

    const response = await middleware(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Admin-Zugang verweigert.' });
  });

  it('allows unauthenticated access to login endpoint', async () => {
    const request = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it('allows unauthenticated access to session endpoint', async () => {
    const request = new NextRequest('http://localhost/api/admin/session');

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
