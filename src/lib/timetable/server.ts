import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta, WEEKDAYS } from './types';
import rawData from '@/generated/timetable-data.json';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

type TimetableGeneratedData = {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTimetableMeta(value: unknown): value is TimetableMeta {
  if (!isObject(value)) return false;
  return (
    typeof value.filename === 'string'
    && typeof value.kw === 'number'
    && (value.halfYear === 1 || value.halfYear === 2)
    && typeof value.yearStart === 'number'
    && typeof value.yearEndShort === 'number'
    && typeof value.href === 'string'
    && (value.lastModifiedMs === undefined || typeof value.lastModifiedMs === 'number')
    && (value.source === undefined || value.source === 'name-pattern' || value.source === 'name-fallback' || value.source === 'file-mtime')
  );
}

function isLessonEntry(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    typeof value.period === 'number'
    && (value.periodEnd === undefined || typeof value.periodEnd === 'number')
    && typeof value.time === 'string'
    && (value.subject === undefined || typeof value.subject === 'string')
    && (value.detail === undefined || typeof value.detail === 'string')
    && (value.room === undefined || typeof value.room === 'string')
  );
}

function isWeekPlan(value: unknown): boolean {
  if (!isObject(value)) return false;
  return WEEKDAYS.every((day) => Array.isArray(value[day]) && value[day].every(isLessonEntry));
}

function isParsedSchedule(value: unknown): value is ParsedSchedule {
  if (!isObject(value)) return false;
  return Object.values(value).every(isWeekPlan);
}

function isTimetableGeneratedData(value: unknown): value is TimetableGeneratedData {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.files) || !value.files.every(isTimetableMeta)) return false;
  if (!isObject(value.schedules)) return false;
  return Object.values(value.schedules).every(isParsedSchedule);
}

const data: TimetableGeneratedData = isTimetableGeneratedData(rawData)
  ? rawData
  : { files: [], schedules: {} };

export function getLatestTimetable(): TimetableMeta | null {
  if (data.files.length === 0) return null;
  const sorted = [...data.files].sort(compareTimetable);
  return sorted[0];
}

export function getTimetableVersion(latest: TimetableMeta | null): string {
  if (!latest) return 'no-timetable';
  const signature = [latest.filename, latest.kw, latest.halfYear, latest.yearStart, latest.lastModifiedMs ?? 0].join('|');
  return crypto.createHash('sha1').update(signature).digest('hex').slice(0, 12);
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
