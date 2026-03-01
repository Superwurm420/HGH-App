import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getLatestTimetable, getTimetableVersion } from '@/lib/timetable/server';
import { getAnnouncements } from '@/lib/announcements/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

function buildBootstrapVersion(timetableVersion: string, announcementsSignature: string): string {
  return `${timetableVersion}:${announcementsSignature}`;
}

function createAnnouncementsSignature(announcements: Awaited<ReturnType<typeof getAnnouncements>>): string {
  const normalized = announcements
    .map((entry) => `${entry.file}|${entry.title ?? ''}|${entry.date ?? ''}|${entry.expires ?? ''}|${entry.body}`)
    .sort()
    .join('||');

  return crypto.createHash('sha1').update(normalized).digest('hex');
}

export async function GET() {
  const latest = await getLatestTimetable();
  const announcements = await getAnnouncements();

  const timetableVersion = getTimetableVersion(latest);
  const announcementsSignature = createAnnouncementsSignature(announcements);
  const version = buildBootstrapVersion(timetableVersion, announcementsSignature);

  const etag = `"${version}"`;
  const reqHeaders = await headers();
  if (reqHeaders.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  }

  return NextResponse.json(
    { latest, announcements, version, generatedAt: new Date().toISOString() },
    {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    },
  );
}
