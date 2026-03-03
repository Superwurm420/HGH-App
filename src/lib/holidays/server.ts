import { getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';
import type { SchoolHolidayRange } from '@/lib/calendar/lowerSaxonySchoolFreeDays';

type HolidaysStorePayload = {
  ranges: SchoolHolidayRange[];
};

export async function getSchoolHolidays(): Promise<SchoolHolidayRange[]> {
  const store = getContentStore();

  try {
    const object = await store.getObject(STORAGE_KEYS.holidays);
    if (object) {
      const parsed = JSON.parse(object.data.toString('utf8')) as Partial<HolidaysStorePayload>;
      if (Array.isArray(parsed.ranges)) {
        return parsed.ranges.filter(
          (range) => typeof range.start === 'string' && typeof range.end === 'string',
        );
      }
    }
  } catch {
    // Fehler beim Laden – leere Liste zurückgeben
  }

  return [];
}

export async function saveSchoolHolidays(ranges: SchoolHolidayRange[]): Promise<void> {
  const store = getContentStore();
  const payload: HolidaysStorePayload = {
    ranges: ranges.filter(
      (range) => typeof range.start === 'string' && typeof range.end === 'string',
    ),
  };
  await store.putObject(
    STORAGE_KEYS.holidays,
    JSON.stringify(payload, null, 2) + '\n',
    'application/json; charset=utf-8',
  );
}
