import fs from 'node:fs';
import path from 'node:path';
import { Announcement, isActive, isVisibleForClass, parseAnnouncement, toSpecialEvent } from './parser';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

const announcementDir = path.join(process.cwd(), 'public/content/announcements');

function loadAnnouncementsFromTxt(): Announcement[] {
  if (!fs.existsSync(announcementDir)) return [];

  const files = fs
    .readdirSync(announcementDir)
    .filter((file) => file.toLowerCase().endsWith('.txt'))
    .sort();

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(announcementDir, file), 'utf8');
    return parseAnnouncement(raw, file);
  });
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return loadAnnouncementsFromTxt().filter((x) => isActive(x));
}

export async function getAnnouncementsByClass(schoolClass: SchoolClass): Promise<Announcement[]> {
  const announcements = await getAnnouncements();
  return announcements.filter((x) => isVisibleForClass(x, schoolClass));
}

export async function getSpecialEventsByClass(schoolClass: SchoolClass): Promise<SpecialEvent[]> {
  const announcements = await getAnnouncementsByClass(schoolClass);
  return announcements
    .map(toSpecialEvent)
    .filter((x): x is SpecialEvent => x !== null);
}

export async function getSpecialEventsForAllClasses(): Promise<SpecialEvent[]> {
  const announcements = await getAnnouncements();
  return announcements
    .map(toSpecialEvent)
    .filter((x): x is SpecialEvent => x !== null);
}
