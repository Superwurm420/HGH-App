import fs from 'node:fs/promises';
import path from 'node:path';
import { getContentStore } from '../storage/content-store';
import { STORAGE_KEYS } from '../storage/object-keys';

type CalendarStorePayload = {
  urls: string[];
};

const CALENDAR_FALLBACK_PATH = path.join(process.cwd(), 'public/content/kalender.txt');
const MIGRATE_FALLBACK_TO_STORE = process.env.CONTENT_STORE_MIGRATE_ON_FALLBACK?.trim().toLowerCase() === 'true';

function filterHttpUrls(lines: string[]): string[] {
  return lines.map((line) => line.trim()).filter((line) => line.startsWith('http'));
}

/**
 * Lädt Kalender-URLs aus dem Content Store.
 * Versucht zuerst das neue JSON-Format (calendar/urls.json),
 * dann das alte Textformat (calendar/kalender.txt) als Fallback.
 */
export async function getCalendarUrls(): Promise<string[]> {
  const store = getContentStore();
  const migrateFromFallback = async (urls: string[], source: string): Promise<void> => {
    if (!MIGRATE_FALLBACK_TO_STORE || urls.length === 0) {
      return;
    }

    const payload: CalendarStorePayload = { urls };
    try {
      await store.putObject(
        STORAGE_KEYS.calendar,
        JSON.stringify(payload, null, 2) + '\n',
        'application/json; charset=utf-8',
      );
      console.info(`[calendar] Fallback-Inhalt aus ${source} in den Store migriert.`);
    } catch (error) {
      console.warn(`[calendar] Konnte Fallback-Inhalt aus ${source} nicht in den Store migrieren.`, error);
    }
  };

  // Neues JSON-Format
  try {
    const object = await store.getObject(STORAGE_KEYS.calendar);
    if (object) {
      const parsed = JSON.parse(object.data.toString('utf8')) as Partial<CalendarStorePayload>;
      if (Array.isArray(parsed.urls)) {
        return parsed.urls.filter((url) => typeof url === 'string' && url.startsWith('http'));
      }
      console.warn('[calendar] Store-Objekt calendar/urls.json enthält kein gültiges urls-Array.');
    } else {
      console.info('[calendar] Store-Objekt calendar/urls.json fehlt, nutze Fallbacks.');
    }
  } catch (error) {
    console.warn('[calendar] Fehler beim Laden von calendar/urls.json, nutze Fallbacks.', error);
  }

  // Legacy-Fallback: kalender.txt (Zeilen mit http-URLs)
  try {
    const object = await store.getObject(STORAGE_KEYS.calendarLegacy);
    if (object) {
      const urls = filterHttpUrls(object.data.toString('utf8').split(/\r?\n/));
      await migrateFromFallback(urls, STORAGE_KEYS.calendarLegacy);
      return urls;
    }
    console.info('[calendar] Legacy-Store-Objekt calendar/kalender.txt fehlt, prüfe public/content/kalender.txt.');
  } catch (error) {
    console.warn('[calendar] Fehler beim Laden von calendar/kalender.txt, prüfe public/content/kalender.txt.', error);
  }

  try {
    const fallbackFile = await fs.readFile(CALENDAR_FALLBACK_PATH, 'utf8');
    const urls = filterHttpUrls(fallbackFile.split(/\r?\n/));
    await migrateFromFallback(urls, 'public/content/kalender.txt');
    return urls;
  } catch (error) {
    console.warn('[calendar] Konnte public/content/kalender.txt nicht lesen.', error);
  }

  console.warn('[calendar] Keine Kalender-URLs verfügbar. Nutze sicheren Default ([]).');
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
