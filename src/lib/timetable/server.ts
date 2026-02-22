import fs from 'node:fs/promises';
import path from 'node:path';
import { weekdayForToday } from './pdfParser';
import { selectLatestTimetable } from './selectLatest';
import { ParsedSchedule, SchoolClass } from './types';
import { parseTimetablePdf } from './parsePdf';

const TIMETABLE_DIR = path.join(process.cwd(), 'public/content/timetables');

export async function getLatestTimetable() {
  const files = await fs.readdir(TIMETABLE_DIR);
  const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  return selectLatestTimetable(pdfs);
}

async function parsePdf(fileName: string): Promise<ParsedSchedule> {
  const pdfPath = path.join(TIMETABLE_DIR, fileName);
  return parseTimetablePdf(pdfPath);
}

let cache: { filename: string; parsed: ParsedSchedule } | null = null;

export async function getWeeklyPlanForClass(requestedClass?: SchoolClass) {
  const latest = await getLatestTimetable();
  if (!latest) return null;

  const parsed = cache?.filename === latest.filename ? cache.parsed : await parsePdf(latest.filename);
  if (!cache || cache.filename !== latest.filename) cache = { filename: latest.filename, parsed };

  const availableClasses = Object.keys(parsed).sort();
  if (availableClasses.length === 0) return null;

  const schoolClass = requestedClass && parsed[requestedClass] ? requestedClass : availableClasses[0];

  return {
    latest,
    availableClasses,
    schoolClass,
    week: parsed[schoolClass],
    todayKey: weekdayForToday(),
  };
}
