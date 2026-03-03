import { AnnouncementFormData, parseAnnouncementTxt, serializeAnnouncementTxt } from './editor';
import { ContentStoreUnavailableError, getContentStore } from '../storage/content-store';
import { STORAGE_KEYS } from '../storage/object-keys';

export type AnnouncementRecord = {
  id: string;
  title: string;
  date: string;
  audience: string;
  classes: string[];
  expires: string;
  anzeige: 'ja' | 'nein';
  highlight: boolean;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type AnnouncementStorePayload = {
  version: 1;
  announcements: AnnouncementRecord[];
};

export class AnnouncementStoreReadError extends Error {
  readonly storeKey: string;
  readonly reason: string;

  constructor(storeKeyValue: string, reason: string, options?: ErrorOptions) {
    super(`Ankündigungs-Store kann nicht gelesen werden: ${reason}`, options);
    this.name = 'AnnouncementStoreReadError';
    this.storeKey = storeKeyValue;
    this.reason = reason;
  }
}

export class AnnouncementStoreWriteError extends Error {
  readonly storeKey: string;
  readonly reason: string;

  constructor(storeKeyValue: string, reason: string, options?: ErrorOptions) {
    super(`Ankündigungs-Store kann nicht geschrieben werden: ${reason}`, options);
    this.name = 'AnnouncementStoreWriteError';
    this.storeKey = storeKeyValue;
    this.reason = reason;
  }
}

function normalizeAnzeige(value: string): 'ja' | 'nein' {
  return value.trim().toLowerCase() === 'ja' ? 'ja' : 'nein';
}

function sanitizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseClasses(value: string): string[] {
  return [...new Set(value.split(/[;,/|\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function sanitizeClasses(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))];
  }
  if (typeof value === 'string') {
    return parseClasses(value);
  }
  return [];
}

function normalizeRecord(entry: unknown): AnnouncementRecord | null {
  if (!entry || typeof entry !== 'object') return null;

  const raw = entry as Partial<AnnouncementRecord>;
  const id = sanitizeString(raw.id).trim();
  if (!id) return null;

  const anzeige = normalizeAnzeige(sanitizeString(raw.anzeige, raw.highlight ? 'ja' : 'nein'));

  return {
    id,
    title: sanitizeString(raw.title),
    date: sanitizeString(raw.date),
    audience: sanitizeString(raw.audience, 'alle'),
    classes: sanitizeClasses(raw.classes),
    expires: sanitizeString(raw.expires),
    anzeige,
    highlight: anzeige === 'ja',
    body: sanitizeString(raw.body),
    createdAt: sanitizeString(raw.createdAt),
    updatedAt: sanitizeString(raw.updatedAt),
  };
}

function serializeClasses(value: string[]): string {
  return value.join(', ');
}

async function readStore(): Promise<AnnouncementStorePayload> {
  const store = getContentStore();
  const storeKey = STORAGE_KEYS.announcements;

  let rawStore: string;
  try {
    const object = await store.getObject(storeKey);
    if (!object) {
      return { version: 1, announcements: [] };
    }
    rawStore = object.data.toString('utf8');
  } catch (error) {
    if (error instanceof ContentStoreUnavailableError) {
      throw new AnnouncementStoreReadError(storeKey, error.message, { cause: error });
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(rawStore) as Partial<AnnouncementStorePayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.announcements)) {
      throw new Error('Ungültiges Store-Schema (version/announcements).');
    }

    return {
      version: 1,
      announcements: parsed.announcements
        .map((entry) => normalizeRecord(entry))
        .filter((entry): entry is AnnouncementRecord => entry !== null),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unbekannter Lesefehler';
    throw new AnnouncementStoreReadError(storeKey, reason, error instanceof Error ? { cause: error } : undefined);
  }
}

async function writeStore(payload: AnnouncementStorePayload): Promise<void> {
  const store = getContentStore();
  const storeKey = STORAGE_KEYS.announcements;

  try {
    await store.putObject(storeKey, `${JSON.stringify(payload, null, 2)}\n`, 'application/json; charset=utf-8');
  } catch (error) {
    if (error instanceof ContentStoreUnavailableError) {
      throw new AnnouncementStoreWriteError(storeKey, error.message, { cause: error });
    }
    throw error;
  }
}

export function toRecord(data: AnnouncementFormData, id: string, now: Date = new Date(), createdAt?: string): AnnouncementRecord {
  const anzeige = normalizeAnzeige(data.anzeige);
  return {
    id,
    title: data.title.trim(),
    date: data.date.trim(),
    audience: data.audience.trim() || 'alle',
    classes: parseClasses(data.classes),
    expires: data.expires.trim(),
    anzeige,
    highlight: anzeige === 'ja',
    body: data.body.trim(),
    createdAt: createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function toFormData(record: AnnouncementRecord): AnnouncementFormData {
  return {
    title: record.title,
    date: record.date,
    audience: record.audience,
    classes: serializeClasses(record.classes),
    expires: record.expires,
    anzeige: record.anzeige,
    body: record.body,
  };
}

export async function listAnnouncementRecords(): Promise<AnnouncementRecord[]> {
  return (await readStore()).announcements;
}

export async function getAnnouncementRecord(id: string): Promise<AnnouncementRecord | null> {
  return (await listAnnouncementRecords()).find((entry) => entry.id === id) ?? null;
}

export async function upsertAnnouncementRecord(record: AnnouncementRecord): Promise<void> {
  const store = await readStore();
  const index = store.announcements.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    store.announcements[index] = record;
  } else {
    store.announcements.push(record);
  }
  await writeStore(store);
}

export async function deleteAnnouncementRecord(id: string): Promise<boolean> {
  const store = await readStore();
  const next = store.announcements.filter((entry) => entry.id !== id);
  if (next.length === store.announcements.length) return false;
  await writeStore({ ...store, announcements: next });
  return true;
}

export function recordToRawTxt(record: AnnouncementRecord): string {
  return serializeAnnouncementTxt(toFormData(record));
}

export function parseRecordFromRawTxt(id: string, rawTxt: string, now: Date = new Date()): AnnouncementRecord {
  const parsed = parseAnnouncementTxt(rawTxt);
  return toRecord(parsed, id, now);
}
