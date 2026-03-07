import { Env } from './types';
import { Router } from './router';
import { handleApiBootstrap } from './routes/bootstrap';
import { handleTimetable, handleTimetableClasses } from './routes/timetable';
import { handleAnnouncements, handleAnnouncementById } from './routes/announcements';
import { handleEvents, handleEventById } from './routes/events';
import { handleSettings, handleSettingByKey } from './routes/settings';
import { handleAdminLogin, handleAdminLogout, handleAdminSession } from './routes/admin/auth';
import { handleAdminAnnouncements, handleAdminAnnouncementById } from './routes/admin/announcements';
import { handleAdminEvents, handleAdminEventById } from './routes/admin/events';
import { handleAdminUploads, handleAdminUploadById, handleAdminUploadActivate } from './routes/admin/uploads';
import { handleAdminSettings } from './routes/admin/settings';
import { handleAdminAuditLogs } from './routes/admin/audit';
import { requireAuth } from './middleware/auth';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const router = new Router();

    // ── CORS preflight ──────────────────────────────────────────
    router.options('/api/*', () => corsResponse());

    // ── Public API ──────────────────────────────────────────────
    router.get('/api/bootstrap', (req) => handleApiBootstrap(req, env));
    router.get('/api/timetable', (req) => handleTimetable(req, env));
    router.get('/api/timetable/classes', (req) => handleTimetableClasses(req, env));
    router.get('/api/announcements', (req) => handleAnnouncements(req, env));
    router.get('/api/announcements/:id', (req, params) => handleAnnouncementById(req, env, params.id));
    router.get('/api/events', (req) => handleEvents(req, env));
    router.get('/api/events/:id', (req, params) => handleEventById(req, env, params.id));
    router.get('/api/settings', (req) => handleSettings(req, env));
    router.get('/api/settings/:key', (req, params) => handleSettingByKey(req, env, params.key));

    // ── Admin Auth ──────────────────────────────────────────────
    router.post('/api/admin/login', (req) => handleAdminLogin(req, env));
    router.post('/api/admin/logout', (req) => handleAdminLogout(req, env));
    router.get('/api/admin/session', (req) => handleAdminSession(req, env));

    // ── Admin API (protected) ───────────────────────────────────
    router.get('/api/admin/announcements', (req) => withAuth(req, env, () => handleAdminAnnouncements(req, env)));
    router.post('/api/admin/announcements', (req) => withAuth(req, env, () => handleAdminAnnouncements(req, env)));
    router.put('/api/admin/announcements/:id', (req, params) => withAuth(req, env, () => handleAdminAnnouncementById(req, env, params.id)));
    router.delete('/api/admin/announcements/:id', (req, params) => withAuth(req, env, () => handleAdminAnnouncementById(req, env, params.id)));

    router.get('/api/admin/events', (req) => withAuth(req, env, () => handleAdminEvents(req, env)));
    router.post('/api/admin/events', (req) => withAuth(req, env, () => handleAdminEvents(req, env)));
    router.put('/api/admin/events/:id', (req, params) => withAuth(req, env, () => handleAdminEventById(req, env, params.id)));
    router.delete('/api/admin/events/:id', (req, params) => withAuth(req, env, () => handleAdminEventById(req, env, params.id)));

    router.get('/api/admin/uploads', (req) => withAuth(req, env, () => handleAdminUploads(req, env)));
    router.post('/api/admin/uploads', (req) => withAuth(req, env, () => handleAdminUploads(req, env)));
    router.get('/api/admin/uploads/:id', (req, params) => withAuth(req, env, () => handleAdminUploadById(req, env, params.id)));
    router.delete('/api/admin/uploads/:id', (req, params) => withAuth(req, env, () => handleAdminUploadById(req, env, params.id)));
    router.post('/api/admin/uploads/:id/activate', (req, params) => withAuth(req, env, () => handleAdminUploadActivate(req, env, params.id)));

    router.get('/api/admin/settings', (req) => withAuth(req, env, () => handleAdminSettings(req, env)));
    router.put('/api/admin/settings', (req) => withAuth(req, env, () => handleAdminSettings(req, env)));

    router.get('/api/admin/audit', (req) => withAuth(req, env, () => handleAdminAuditLogs(req, env)));

    // ── Static assets from R2 or site bucket ────────────────────
    const response = await router.handle(request);
    if (response) {
      return addCorsHeaders(response);
    }

    // Serve static assets from site bucket (Next.js export)
    return new Response('Not Found', { status: 404 });
  },
};

async function withAuth(req: Request, env: Env, handler: () => Promise<Response>): Promise<Response> {
  const authResult = await requireAuth(req, env);
  if (authResult instanceof Response) return authResult;
  return handler();
}

function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Max-Age': '86400',
  };
}

function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders())) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
