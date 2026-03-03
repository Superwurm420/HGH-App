import fs from 'node:fs/promises';
import path from 'node:path';
import { getContentStore } from '../storage/content-store';
import { STORAGE_KEYS } from '../storage/object-keys';
import { validateMessagesData } from '../validation/content-schemas';

export type MessageCategoryStrings = {
  vorUnterricht?: string[];
  inPause?: string[];
  nachUnterricht?: string[];
  wochenende?: string[];
  feiertag?: string[];
  freierTag?: string[];
};

export type MessagesData = {
  standard?: MessageCategoryStrings;
  klassen?: Record<string, MessageCategoryStrings>;
  [key: string]: unknown;
};

const EMPTY_MESSAGES: MessagesData = { standard: {} };
const MESSAGES_FALLBACK_PATH = path.join(process.cwd(), 'public/content/messages.json');
const MIGRATE_FALLBACK_TO_STORE = process.env.CONTENT_STORE_MIGRATE_ON_FALLBACK?.trim().toLowerCase() === 'true';

export async function getMessages(): Promise<MessagesData> {
  const store = getContentStore();

  const migrateFromFallback = async (data: MessagesData, source: string): Promise<void> => {
    if (!MIGRATE_FALLBACK_TO_STORE) {
      return;
    }

    try {
      await store.putObject(
        STORAGE_KEYS.messages,
        JSON.stringify(data, null, 2) + '\n',
        'application/json; charset=utf-8',
      );
      console.info(`[messages] Fallback-Inhalt aus ${source} in den Store migriert.`);
    } catch (error) {
      console.warn(`[messages] Konnte Fallback-Inhalt aus ${source} nicht in den Store migrieren.`, error);
    }
  };

  try {
    const object = await store.getObject(STORAGE_KEYS.messages);
    if (object) {
      const parsed = JSON.parse(object.data.toString('utf8')) as MessagesData;
      const validationError = validateMessagesData(parsed);
      if (!validationError) {
        return parsed;
      }
      console.warn(`[messages] Store-Objekt messages/messages.json ist ungültig: ${validationError}`);
    } else {
      console.info('[messages] Store-Objekt messages/messages.json fehlt, nutze Fallbacks.');
    }
  } catch (error) {
    console.warn('[messages] Fehler beim Laden von messages/messages.json, nutze Fallbacks.', error);
  }

  try {
    const fallbackRaw = await fs.readFile(MESSAGES_FALLBACK_PATH, 'utf8');
    const parsed = JSON.parse(fallbackRaw) as MessagesData;
    const validationError = validateMessagesData(parsed);
    if (!validationError) {
      await migrateFromFallback(parsed, 'public/content/messages.json');
      return parsed;
    }
    console.warn(`[messages] Fallback-Datei public/content/messages.json ist ungültig: ${validationError}`);
  } catch (error) {
    console.warn('[messages] Konnte public/content/messages.json nicht lesen oder parsen.', error);
  }

  console.warn('[messages] Keine gültigen Meldungen verfügbar. Nutze sicheren Default.');
  return EMPTY_MESSAGES;
}

export async function saveMessages(data: MessagesData): Promise<void> {
  const store = getContentStore();
  const payload: MessagesData = {
    standard: data.standard ?? {},
    klassen: data.klassen,
  };
  await store.putObject(
    STORAGE_KEYS.messages,
    JSON.stringify(payload, null, 2) + '\n',
    'application/json; charset=utf-8',
  );
}
