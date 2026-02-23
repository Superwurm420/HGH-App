import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta } from './types';
import rawData from '@/data/timetable-data.json';

const data = rawData as unknown as {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

export function getLatestTimetable(): TimetableMeta | null {
  if (data.files.length === 0) return null;
  const sorted = [...data.files].sort(compareTimetable);
  return sorted[0];
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

  return {
    latest,
    availableClasses,
    schoolClass,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}
