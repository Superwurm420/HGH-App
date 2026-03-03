import { getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

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

export async function getMessages(): Promise<MessagesData> {
  const store = getContentStore();

  try {
    const object = await store.getObject(STORAGE_KEYS.messages);
    if (object) {
      const parsed = JSON.parse(object.data.toString('utf8')) as MessagesData;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fehler beim Laden – leere Meldungen zurückgeben
  }

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
