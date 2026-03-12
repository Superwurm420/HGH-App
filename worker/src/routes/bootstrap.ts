import { Env, LessonEntry, Weekday } from '../types';
import { jsonResponse } from '../router';
import { weekdayForToday } from '../services/berlin-time';
import { loadActiveUpload, buildEntriesByClass, type TimetableEntryRow } from '../services/timetable';

/**
 * GET /api/bootstrap
 * Liefert den aktiven Stundenplan + aktive Ankündigungen + Version.
 * Unterstützt ETag-basiertes Caching.
 */
export async function handleApiBootstrap(request: Request, env: Env): Promise<Response> {
  const upload = await loadActiveUpload(env);

  let timetable: {
    upload: typeof upload;
    entries: Record<string, Record<Weekday, LessonEntry[]>>;
    classes: string[];
    todayKey: string;
    updatedAt: string | null;
  } = {
    upload: null,
    entries: {},
    classes: [],
    todayKey: weekdayForToday(),
    updatedAt: null,
  };

  if (upload) {
    const rows = await env.DB.prepare(
      'SELECT * FROM timetable_entries WHERE upload_id = ? ORDER BY class_code, weekday, period'
    ).bind(upload.id).all<TimetableEntryRow>();

    const { entries, classes } = buildEntriesByClass(rows.results);

    timetable = {
      upload,
      entries,
      classes,
      todayKey: weekdayForToday(),
      updatedAt: upload.updated_at,
    };
  }

  // Aktive Ankündigungen laden
  const now = new Date().toISOString();
  const announcements = await env.DB.prepare(
    'SELECT * FROM announcements WHERE (expires IS NULL OR expires = \'\' OR expires > ?) ORDER BY date DESC'
  ).bind(now).all();

  // Version-Hash für ETag
  const versionData = JSON.stringify({
    t: timetable.upload?.id ?? '',
    a: announcements.results.length,
    u: timetable.upload?.updated_at ?? '',
  });
  const versionHash = await hashString(versionData);

  // ETag prüfen
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === `"${versionHash}"`) {
    return new Response(null, { status: 304 });
  }

  return jsonResponse({
    timetable,
    announcements: announcements.results,
    version: versionHash,
  }, 200, {
    'ETag': `"${versionHash}"`,
    'Cache-Control': 'no-cache',
  });
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}
