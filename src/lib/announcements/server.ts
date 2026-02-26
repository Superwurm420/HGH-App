import { Announcement, isActive, toSpecialEvent } from './parser';
import { SchoolClass, SpecialEvent } from '@/lib/timetable/types';
import rawAnnouncements from '@/generated/announcements-data.json';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAnnouncement(value: unknown): value is Announcement {
  if (!isObject(value)) return false;
  return (
    typeof value.file === 'string'
    && (value.title === undefined || typeof value.title === 'string')
    && (value.date === undefined || typeof value.date === 'string')
    && (value.audience === undefined || typeof value.audience === 'string')
    && (value.expires === undefined || typeof value.expires === 'string')
    && typeof value.highlight === 'boolean'
    && typeof value.body === 'string'
    && Array.isArray(value.warnings)
  );
}

const allAnnouncements: Announcement[] = Array.isArray(rawAnnouncements)
  ? rawAnnouncements.filter(isAnnouncement)
  : [];

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
