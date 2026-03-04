import { Announcement, isActive, isVisibleForClass, parseAnnouncement, toSpecialEvent } from './parser';
import { listAnnouncementRecords, recordToRawTxt } from './repository';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

async function loadAnnouncementsFromStore(): Promise<Announcement[]> {
  try {
    return (await listAnnouncementRecords()).map((record) => parseAnnouncement(recordToRawTxt(record), `${record.id}.txt`));
  } catch (error) {
    console.warn('[announcements] Konnte Ankündigungen nicht aus dem Store laden. Nutze sicheren Default ([]).', error);
    return [];
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return (await loadAnnouncementsFromStore()).filter((x) => isActive(x));
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
