import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta, WEEKDAYS } from './types';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

type TimetableGeneratedData = {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

const EMPTY_DATA: TimetableGeneratedData = { files: [], schedules: {} };
const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');
const DATA_PATH = path.join(process.cwd(), 'src/generated/timetable-data.json');
const CHECK_INTERVAL_MS = 5_000;

let cachedData: TimetableGeneratedData | null = null;
let lastCheckedAt = 0;
let isRebuilding = false;

// ── Validation helpers ──────────────────────────────────────────────────────

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

// ── Dynamic data loading with auto-detection ────────────────────────────────

function readDataFromDisk(): TimetableGeneratedData {
  try {
    const raw: unknown = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    return isTimetableGeneratedData(raw) ? raw : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

function listPdfFiles(): string[] {
  try {
    return readdirSync(TIMETABLE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  } catch {
    return [];
  }
}

function hasDirectoryChanged(data: TimetableGeneratedData): boolean {
  const pdfFiles = listPdfFiles();
  const knownFiles = new Set(data.files.map((f) => f.filename));
  const diskFiles = new Set(pdfFiles);
  const hasNew = pdfFiles.some((f) => !knownFiles.has(f));
  const hasRemoved = data.files.some((f) => !diskFiles.has(f.filename));
  return hasNew || hasRemoved;
}

function runPrebuild(): boolean {
  try {
    console.log('[timetable] Neue/entfernte PDFs erkannt – regeneriere Daten…');
    execSync('node scripts/prebuild.mjs', { cwd: process.cwd(), timeout: 60_000, stdio: 'pipe' });
    console.log('[timetable] Prebuild erfolgreich.');
    return true;
  } catch (err) {
    console.error('[timetable] Prebuild fehlgeschlagen:', err instanceof Error ? err.message : err);
    return false;
  }
}

function loadTimetableData(): TimetableGeneratedData {
  const now = Date.now();

  // Return cache if checked recently
  if (cachedData && now - lastCheckedAt < CHECK_INTERVAL_MS) {
    return cachedData;
  }
  lastCheckedAt = now;

  const currentData = readDataFromDisk();

  if (hasDirectoryChanged(currentData) && !isRebuilding) {
    isRebuilding = true;
    try {
      if (runPrebuild()) {
        cachedData = readDataFromDisk();
      } else {
        cachedData = currentData;
      }
    } finally {
      isRebuilding = false;
    }
  } else {
    cachedData = currentData;
  }

  return cachedData;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getLatestTimetable(): TimetableMeta | null {
  const data = loadTimetableData();
  if (data.files.length === 0) return null;
  const sorted = [...data.files].sort(compareTimetable);
  return sorted[0];
}

export function getTimetableVersion(latest: TimetableMeta | null): string {
  if (!latest) return 'no-timetable';
  const signature = [latest.filename, latest.kw, latest.halfYear, latest.yearStart, latest.lastModifiedMs ?? 0].join('|');
  return crypto.createHash('sha1').update(signature).digest('hex').slice(0, 12);
}

function getLatestTimetableUpdatedDate(latest: TimetableMeta): string | null {
  if (typeof latest.lastModifiedMs !== 'number') return null;
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(latest.lastModifiedMs));
}

export async function getWeeklyPlanForClass(requestedClass?: SchoolClass) {
  const data = loadTimetableData();
  const latest = getLatestTimetable();
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
