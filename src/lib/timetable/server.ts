import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta, WEEKDAYS } from './types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

type TimetableGeneratedData = {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

type TimetableContext = {
  data: TimetableGeneratedData;
  latest: TimetableMeta | null;
};

const EMPTY_DATA: TimetableGeneratedData = { files: [], schedules: {} };
const DATA_PATH = path.join(process.cwd(), 'src/generated/timetable-data.json');
const CHECK_INTERVAL_MS = 5_000;

let cachedContext: TimetableContext | null = null;
let lastCheckedAt = 0;

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

function readDataFromDisk(): TimetableGeneratedData {
  try {
    const raw: unknown = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    return isTimetableGeneratedData(raw) ? raw : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

async function hydrateLatestMeta(data: TimetableGeneratedData): Promise<TimetableMeta | null> {
  const scheduleFiles = new Set(Object.keys(data.schedules));
  const candidates = data.files.filter((entry) => scheduleFiles.has(entry.filename));
  if (candidates.length === 0) return null;

  try {
    const store = getContentStore();
    const blobs = await store.list(STORAGE_KEYS.timetablesPrefix);
    const byName = new Map(
      blobs
        .map((entry) => ({
          name: path.posix.basename(entry.key),
          updatedMs: entry.updatedAt?.getTime() ?? 0,
        }))
        .filter((entry) => entry.name.toLowerCase().endsWith('.pdf'))
        .map((entry) => [entry.name, entry.updatedMs]),
    );

    const hydrated = candidates.map((entry) => ({
      ...entry,
      lastModifiedMs: byName.get(entry.filename) ?? entry.lastModifiedMs,
    }));

    return hydrated.sort(compareTimetable)[0] ?? null;
  } catch {
    return [...candidates].sort(compareTimetable)[0] ?? null;
  }
}

async function loadTimetableContext(): Promise<TimetableContext> {
  const now = Date.now();
  if (cachedContext && now - lastCheckedAt < CHECK_INTERVAL_MS) {
    return cachedContext;
  }

  const data = readDataFromDisk();
  const latest = await hydrateLatestMeta(data);
  cachedContext = { data, latest };
  lastCheckedAt = now;
  return cachedContext;
}

export async function getLatestTimetable(): Promise<TimetableMeta | null> {
  return (await loadTimetableContext()).latest;
}

export function getTimetableVersion(latest: TimetableMeta | null): string {
  if (!latest) return 'no-timetable';
  const signature = [latest.filename, latest.kw, latest.halfYear, latest.yearStart, latest.lastModifiedMs ?? 0].join('|');
  return crypto.createHash('sha1').update(signature).digest('hex').slice(0, 12);
}

const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function getLatestTimetableUpdatedDate(latest: TimetableMeta): string | null {
  if (typeof latest.lastModifiedMs !== 'number') return null;
  return berlinDateFormatter.format(new Date(latest.lastModifiedMs));
}

export async function getWeeklyPlanForClass(requestedClass?: SchoolClass) {
  const { data, latest } = await loadTimetableContext();
  if (!latest) return null;

  const parsed = data.schedules[latest.filename];
  if (!parsed) return null;

  const availableClasses = Object.keys(parsed).sort();
  if (availableClasses.length === 0) return null;

  const schoolClass =
    requestedClass && parsed[requestedClass] ? requestedClass : availableClasses[0];

  const updatedAt = getLatestTimetableUpdatedDate(latest);

  return {
    latest,
    updatedAt,
    availableClasses,
    schoolClass,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}

export async function getWeeklyPlanForAllClasses() {
  const { data, latest } = await loadTimetableContext();
  if (!latest) return null;

  const parsed = data.schedules[latest.filename];
  if (!parsed) return null;

  const availableClasses = Object.keys(parsed).sort();
  if (availableClasses.length === 0) return null;

  const updatedAt = getLatestTimetableUpdatedDate(latest);

  return {
    latest,
    updatedAt,
    availableClasses,
    schedulesByClass: parsed,
    todayKey: weekdayForToday(),
  };
}
