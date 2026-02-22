import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { weekdayForToday } from './pdfParser';
import { selectLatestTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass } from './types';

const execFileAsync = promisify(execFile);
const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');
const PARSER_SCRIPT = path.join(process.cwd(), 'scripts/parse-timetable-pdf.mjs');

export async function getLatestTimetable() {
  const files = await fs.readdir(TIMETABLE_DIR);
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  return selectLatestTimetable(pdfs);
}

async function parsePdf(fileName: string): Promise<ParsedSchedule> {
  const pdfPath = path.join(TIMETABLE_DIR, fileName);
  const { stdout } = await execFileAsync('node', [PARSER_SCRIPT, pdfPath], { maxBuffer: 1024 * 1024 * 10 });
  return JSON.parse(stdout) as ParsedSchedule;
}

let cache: { filename: string; parsed: ParsedSchedule } | null = null;

export async function getWeeklyPlanForClass(schoolClass: SchoolClass) {
  const latest = await getLatestTimetable();
  if (!latest) return null;

  const parsed = cache?.filename === latest.filename ? cache.parsed : await parsePdf(latest.filename);
  if (!cache || cache.filename !== latest.filename) cache = { filename: latest.filename, parsed };

  return {
    latest,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}
