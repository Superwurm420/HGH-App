import { NextResponse } from 'next/server';
import { getLatestTimetable, getTimetableVersion } from '@/lib/timetable/server';
import { getAnnouncements } from '@/lib/announcements/server';
import { headers } from 'next/headers';

export async function GET() {
  const latest = await getLatestTimetable();
  const announcements = await getAnnouncements();
  const version = getTimetableVersion(latest);
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
