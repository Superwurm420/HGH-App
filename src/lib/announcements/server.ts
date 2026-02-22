import fs from 'node:fs/promises';
import path from 'node:path';
import { parseAnnouncement, isActive, toSpecialEvent } from './parser';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

const ANNOUNCEMENT_DIR = path.join(process.cwd(), 'public/content/announcements');

export async function getAnnouncements() {
  const files = (await fs.readdir(ANNOUNCEMENT_DIR)).filter((f) => f.toLowerCase().endsWith('.txt'));
  const parsed = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(ANNOUNCEMENT_DIR, file), 'utf8');
      return parseAnnouncement(raw, file);
    }),
  );

  return parsed.filter((x) => isActive(x));
}

export async function getSpecialEventsByClass(schoolClass: SchoolClass): Promise<SpecialEvent[]> {
  const announcements = await getAnnouncements();
  return announcements
    .map(toSpecialEvent)
    .filter((x): x is SpecialEvent => x !== null)
    .filter((event) => event.classes === 'alle' || event.classes.includes(schoolClass));
}
