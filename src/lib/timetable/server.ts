import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta } from './types';
import rawData from '@/generated/timetable-data.json';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const data = rawData as unknown as {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

export function getLatestTimetable(): TimetableMeta | null {
  if (data.files.length === 0) return null;
  const sorted = [...data.files].sort(compareTimetable);
  return sorted[0];
}

async function getLatestTimetableUpdatedDate(latest: TimetableMeta): Promise<string | null> {
  try {
    const relativePath = latest.href.replace(/^\//, '');
    const filePath = path.join(process.cwd(), 'public', relativePath.replace(/^content\//, 'content/'));
    const fileStats = await stat(filePath);
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fileStats.mtime);
  } catch {
    return null;
  }
}

export async function getWeeklyPlanForClass(requestedClass?: SchoolClass) {
  const latest = getLatestTimetable();
  if (!latest) return null;

  const parsed = data.schedules[latest.filename];
  if (!parsed) return null;

  const availableClasses = Object.keys(parsed).sort();
  if (availableClasses.length === 0) return null;

  const schoolClass =
    requestedClass && parsed[requestedClass] ? requestedClass : availableClasses[0];

  const updatedAt = await getLatestTimetableUpdatedDate(latest);

  return {
    latest,
    updatedAt,
    availableClasses,
    schoolClass,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}
