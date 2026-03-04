import { weekdayForToday } from './pdfParser';
import { compareTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta } from './types';
import crypto from 'node:crypto';
import { readTimetableGeneratedData } from './generated-data';
import { listContentItems } from '@/lib/supabase/content-store';

type TimetableGeneratedData = {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

type TimetableContext = {
  data: TimetableGeneratedData;
  latest: TimetableMeta | null;
};

const CHECK_INTERVAL_MS = 5_000;

let cachedContext: TimetableContext | null = null;
let lastCheckedAt = 0;

async function hydrateLatestMeta(data: TimetableGeneratedData): Promise<TimetableMeta | null> {
  const scheduleFiles = new Set(Object.keys(data.schedules));
  const candidates = data.files.filter((entry) => scheduleFiles.has(entry.filename));
  if (candidates.length === 0) return null;

  try {
    const items = await listContentItems('timetable');
    const byName = new Map(
      items
        .map((item) => {
          const segments = item.key.split('/');
          return {
            name: segments[segments.length - 1] ?? '',
            updatedMs: new Date(item.created_at).getTime(),
          };
        })
        .filter((entry) => entry.name.toLowerCase().endsWith('.pdf') && Number.isFinite(entry.updatedMs))
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

  const data = await readTimetableGeneratedData();
  const latest = await hydrateLatestMeta(data);
  cachedContext = { data, latest };
  lastCheckedAt = now;
  return cachedContext;
}

export function invalidateTimetableCache(): void {
  cachedContext = null;
  lastCheckedAt = 0;
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
