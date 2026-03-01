import { Announcement, isActive, isVisibleForClass, parseAnnouncement, toSpecialEvent } from './parser';
import { listAnnouncementRecords, recordToRawTxt } from './repository';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';

function loadAnnouncementsFromStore(): Announcement[] {
  return listAnnouncementRecords().map((record) => parseAnnouncement(recordToRawTxt(record), `${record.id}.txt`));
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return loadAnnouncementsFromStore().filter((x) => isActive(x));
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
