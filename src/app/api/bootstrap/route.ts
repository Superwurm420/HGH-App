import { NextResponse } from 'next/server';
import { getLatestTimetable } from '@/lib/timetable/server';
import { getAnnouncements } from '@/lib/announcements/server';

export async function GET() {
  const latest = await getLatestTimetable();
  const announcements = await getAnnouncements();
  return NextResponse.json({ latest, announcements, generatedAt: new Date().toISOString() });
}
