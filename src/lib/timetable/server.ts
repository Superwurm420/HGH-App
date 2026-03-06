import { weekdayForToday } from './pdfParser';
import { compareTimetable, parseTimetableFilename } from './selectLatest';
import { ParsedSchedule, SchoolClass, TimetableMeta } from './types';
import crypto from 'node:crypto';
import { getContentStore } from '@/lib/storage/content-store';
import fs from 'node:fs/promises';
import path from 'node:path';

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
    const store = getContentStore();
    const items = await store.listItems('timetable');
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseMetaFromItem(item: { key: string; created_at: string; meta: Record<string, unknown> | null }): TimetableMeta | null {
  const filename = item.key.split('/').pop();
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    return null;
  }

  const baseMeta = asRecord(item.meta?.timetable);
  const parsedFromMeta = baseMeta
    ? {
      filename: typeof baseMeta.filename === 'string' ? baseMeta.filename : filename,
      kw: typeof baseMeta.kw === 'number' ? baseMeta.kw : undefined,
      halfYear: baseMeta.halfYear === 1 || baseMeta.halfYear === 2 ? baseMeta.halfYear : undefined,
      yearStart: typeof baseMeta.yearStart === 'number' ? baseMeta.yearStart : undefined,
      yearEndShort: typeof baseMeta.yearEndShort === 'number' ? baseMeta.yearEndShort : undefined,
      href: typeof baseMeta.href === 'string' ? baseMeta.href : `/content/timetables/${filename}`,
      source: (baseMeta.source === 'name-pattern' || baseMeta.source === 'name-fallback' || baseMeta.source === 'file-mtime'
        ? baseMeta.source
        : undefined) as TimetableMeta['source'],
      lastModifiedMs: typeof baseMeta.lastModifiedMs === 'number' ? baseMeta.lastModifiedMs : undefined,
    }
    : null;

  if (
    parsedFromMeta &&
    typeof parsedFromMeta.kw === 'number' &&
    (parsedFromMeta.halfYear === 1 || parsedFromMeta.halfYear === 2) &&
    typeof parsedFromMeta.yearStart === 'number' &&
    typeof parsedFromMeta.yearEndShort === 'number'
  ) {
    return {
      filename: parsedFromMeta.filename,
      kw: parsedFromMeta.kw,
      halfYear: parsedFromMeta.halfYear,
      yearStart: parsedFromMeta.yearStart,
      yearEndShort: parsedFromMeta.yearEndShort,
      href: parsedFromMeta.href,
      source: parsedFromMeta.source,
      lastModifiedMs: parsedFromMeta.lastModifiedMs ?? new Date(item.created_at).getTime(),
    };
  }

  return parseTimetableFilename(filename, { lastModifiedMs: new Date(item.created_at).getTime() });
}

async function readTimetableDataFromContentItems(): Promise<TimetableGeneratedData> {
  const store = getContentStore();
  const items = await store.listItems('timetable');

  const files: TimetableMeta[] = [];
  const schedules: Record<string, ParsedSchedule> = {};

  for (const item of items) {
    if (!item.key.toLowerCase().endsWith('.pdf')) {
      continue;
    }

    const filename = item.key.split('/').pop();
    if (!filename) {
      continue;
    }

    const meta = parseMetaFromItem(item);
    if (meta) {
      files.push(meta);
    }

    if (item.timetable_json && Object.keys(item.timetable_json).length > 0) {
      schedules[filename] = item.timetable_json as unknown as ParsedSchedule;
    }
  }

  return { files, schedules };
}

async function readTimetableDataFromGeneratedJson(): Promise<TimetableGeneratedData> {
  try {
    const jsonPath = path.join(process.cwd(), 'src/generated/timetable-data.json');
    const raw = await fs.readFile(jsonPath, 'utf8');
    return JSON.parse(raw) as TimetableGeneratedData;
  } catch {
    return { files: [], schedules: {} };
  }
}

async function loadTimetableContext(): Promise<TimetableContext> {
  const now = Date.now();
  if (cachedContext && now - lastCheckedAt < CHECK_INTERVAL_MS) {
    return cachedContext;
  }

  let data: TimetableGeneratedData;
  try {
    data = await readTimetableDataFromContentItems();
  } catch (error) {
    console.warn('[timetable] Supabase nicht erreichbar, nutze prebuild-JSON als Fallback.', error);
    data = await readTimetableDataFromGeneratedJson();
  }

  // Wenn Supabase keine Daten hat, prebuild-JSON als Fallback nutzen
  if (data.files.length === 0 && Object.keys(data.schedules).length === 0) {
    const fallback = await readTimetableDataFromGeneratedJson();
    if (fallback.files.length > 0) {
      data = fallback;
    }
  }

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
  try {
    return (await loadTimetableContext()).latest;
  } catch (error) {
    console.warn('[timetable] Konnte neuesten Stundenplan nicht laden.', error);
    return null;
  }
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
  try {
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
  } catch (error) {
    console.warn('[timetable] Konnte Wochenplan nicht laden. Nutze sicheren Fallback (null).', error);
    return null;
  }
}

export async function getWeeklyPlanForAllClasses() {
  try {
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
  } catch (error) {
    console.warn('[timetable] Konnte Wochenplan-Übersicht nicht laden. Nutze sicheren Fallback (null).', error);
    return null;
  }
}
