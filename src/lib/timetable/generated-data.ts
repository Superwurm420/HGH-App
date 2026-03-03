import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { compareTimetable, parseTimetableFilename } from './selectLatest';
import { ParsedSchedule, TimetableMeta } from './types';

const execFileAsync = promisify(execFile);
const DATA_PATH = path.join(process.cwd(), 'src/generated/timetable-data.json');
const PARSE_SCRIPT_PATH = path.join(process.cwd(), 'scripts/parse-timetable-pdf.mjs');

type TimetableGeneratedData = {
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

const EMPTY_DATA: TimetableGeneratedData = { files: [], schedules: {} };

export async function readTimetableGeneratedData(): Promise<TimetableGeneratedData> {
  try {
    const raw = JSON.parse(await fs.readFile(DATA_PATH, 'utf8')) as Partial<TimetableGeneratedData>;
    return {
      files: Array.isArray(raw.files) ? raw.files as TimetableMeta[] : [],
      schedules: raw.schedules && typeof raw.schedules === 'object' ? raw.schedules as Record<string, ParsedSchedule> : {},
    };
  } catch {
    return EMPTY_DATA;
  }
}

async function writeTimetableGeneratedData(data: TimetableGeneratedData): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function upsertTimetableIndexEntry(params: {
  filename: string;
  lastModifiedMs: number;
  schedule?: ParsedSchedule;
}): Promise<{ metaUpdated: boolean; scheduleUpdated: boolean }> {
  const meta = parseTimetableFilename(params.filename, { lastModifiedMs: params.lastModifiedMs });
  if (!meta) {
    return { metaUpdated: false, scheduleUpdated: false };
  }

  const data = await readTimetableGeneratedData();
  const withoutCurrent = data.files.filter((entry) => entry.filename !== params.filename);
  const files = [...withoutCurrent, meta].sort(compareTimetable);

  const schedules = { ...data.schedules };
  if (params.schedule) {
    schedules[params.filename] = params.schedule;
  }

  await writeTimetableGeneratedData({ files, schedules });
  return { metaUpdated: true, scheduleUpdated: Boolean(params.schedule) };
}

export async function parseUploadedTimetablePdf(data: Buffer): Promise<ParsedSchedule> {
  const tempPath = path.join(os.tmpdir(), `hgh-upload-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  await fs.writeFile(tempPath, data);

  try {
    const { stdout } = await execFileAsync(process.execPath, [PARSE_SCRIPT_PATH, tempPath], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout.trim()) as ParsedSchedule;
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}
