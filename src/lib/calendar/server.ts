import { getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

type CalendarStorePayload = {
  urls: string[];
};

/**
 * Lädt Kalender-URLs aus dem Content Store.
 * Versucht zuerst das neue JSON-Format (calendar/urls.json),
 * dann das alte Textformat (calendar/kalender.txt) als Fallback.
 */
export async function getCalendarUrls(): Promise<string[]> {
  const store = getContentStore();

  // Neues JSON-Format
  try {
    const object = await store.getObject(STORAGE_KEYS.calendar);
    if (object) {
      const parsed = JSON.parse(object.data.toString('utf8')) as Partial<CalendarStorePayload>;
      if (Array.isArray(parsed.urls)) {
        return parsed.urls.filter((url) => typeof url === 'string' && url.startsWith('http'));
      }
    }
  } catch {
    // Fehler beim neuen Format – Fallback versuchen
  }

  // Legacy-Fallback: kalender.txt (Zeilen mit http-URLs)
  try {
    const object = await store.getObject(STORAGE_KEYS.calendarLegacy);
    if (object) {
      return object.data
        .toString('utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('http'));
    }
  } catch {
    // Kein Fallback vorhanden
  }

  return [];
}

/**
 * Speichert Kalender-URLs im Content Store (JSON-Format).
 */
export async function saveCalendarUrls(urls: string[]): Promise<void> {
  const store = getContentStore();
  const payload: CalendarStorePayload = {
    urls: urls.filter((url) => typeof url === 'string' && url.startsWith('http')),
  };
  await store.putObject(
    STORAGE_KEYS.calendar,
    JSON.stringify(payload, null, 2) + '\n',
    'application/json; charset=utf-8',
  );
}
