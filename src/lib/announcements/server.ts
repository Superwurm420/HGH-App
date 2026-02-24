import { Announcement, isActive, toSpecialEvent } from './parser';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';
import rawAnnouncements from '@/generated/announcements-data.json';

const allAnnouncements = rawAnnouncements as unknown as Announcement[];

export async function getAnnouncements(): Promise<Announcement[]> {
  return allAnnouncements.filter((x) => isActive(x));
}

export async function getSpecialEventsByClass(schoolClass: SchoolClass): Promise<SpecialEvent[]> {
  const announcements = await getAnnouncements();
  return announcements
    .map(toSpecialEvent)
    .filter((x): x is SpecialEvent => x !== null)
    .filter((event) => event.classes === 'alle' || event.classes.includes(schoolClass));
}
