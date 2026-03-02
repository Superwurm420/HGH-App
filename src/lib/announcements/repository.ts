import fs from 'node:fs';
import path from 'node:path';
import { AnnouncementFormData, parseAnnouncementTxt, serializeAnnouncementTxt } from './editor';

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

type FsError = NodeJS.ErrnoException;

export class AnnouncementStoreReadError extends Error {
  readonly storePath: string;
  readonly reason: string;

  constructor(storePathValue: string, reason: string, options?: ErrorOptions) {
    super(`Ankündigungs-Store kann nicht gelesen werden: ${reason}`, options);
    this.name = 'AnnouncementStoreReadError';
    this.storePath = storePathValue;
    this.reason = reason;
  }
}

const storeDir = path.join(process.cwd(), 'data');
const storePath = path.join(storeDir, 'announcements-store.json');
let memoryStoreFallback: AnnouncementStorePayload | null = null;

function clonePayload(payload: AnnouncementStorePayload): AnnouncementStorePayload {
  return {
    version: 1,
    announcements: payload.announcements.map((entry) => ({ ...entry, classes: [...entry.classes] })),
  };
}

export function isFileSystemAccessError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as FsError).code;
  return code === 'EROFS' || code === 'EACCES' || code === 'EPERM' || code === 'ENOSPC';
}

function ensureStoreExists(): void {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    const initialPayload: AnnouncementStorePayload = {
      version: 1,
      announcements: [],
    };
    fs.writeFileSync(storePath, `${JSON.stringify(initialPayload, null, 2)}\n`, 'utf8');
  }
}

function normalizeAnzeige(value: string): 'ja' | 'nein' {
  return value.trim().toLowerCase() === 'ja' ? 'ja' : 'nein';
}

function sanitizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
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

function parseClasses(value: string): string[] {
  return [...new Set(value.split(/[;,/|\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function serializeClasses(value: string[]): string {
  return value.join(', ');
}

function readStore(): AnnouncementStorePayload {
  if (memoryStoreFallback) {
    return clonePayload(memoryStoreFallback);
  }

  if (!fs.existsSync(storePath)) {
    return { version: 1, announcements: [] };
  }

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AnnouncementStorePayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.announcements)) {
      throw new Error('Ungültiges Store-Schema (version/announcements).');
    }

    const announcements = parsed.announcements
      .map((entry) => normalizeRecord(entry))
      .filter((entry): entry is AnnouncementRecord => entry !== null);

    return {
      version: 1,
      announcements,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unbekannter Lesefehler';
    console.error(`[announcements] Fehlerhafter Store (${storePath}): ${reason}`);

    const quarantinePath = `${storePath}.broken-${Date.now()}`;
    try {
      fs.renameSync(storePath, quarantinePath);
      console.error(`[announcements] Defekter Store wurde nach ${quarantinePath} verschoben.`);
    } catch (renameError) {
      const renameReason = renameError instanceof Error ? renameError.message : 'Unbekannter Fehler beim Verschieben';
      console.error(`[announcements] Quarantäne fehlgeschlagen (${storePath}): ${renameReason}`);
    }

    throw new AnnouncementStoreReadError(storePath, reason, error instanceof Error ? { cause: error } : undefined);
  }
}

function writeStore(payload: AnnouncementStorePayload): void {
  if (memoryStoreFallback) {
    memoryStoreFallback = clonePayload(payload);
    return;
  }

  try {
    ensureStoreExists();
    fs.writeFileSync(storePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (isFileSystemAccessError(error)) {
      console.warn(
        `[announcements] Store kann nicht auf Dateisystem geschrieben werden (${storePath}). Wechsle auf In-Memory-Fallback.`,
      );
      memoryStoreFallback = clonePayload(payload);
      return;
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

export function listAnnouncementRecords(): AnnouncementRecord[] {
  return readStore().announcements;
}

export function getAnnouncementRecord(id: string): AnnouncementRecord | null {
  return listAnnouncementRecords().find((entry) => entry.id === id) ?? null;
}

export function upsertAnnouncementRecord(record: AnnouncementRecord): void {
  const store = readStore();
  const index = store.announcements.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    store.announcements[index] = record;
  } else {
    store.announcements.push(record);
  }
  writeStore(store);
}

export function deleteAnnouncementRecord(id: string): boolean {
  const store = readStore();
  const next = store.announcements.filter((entry) => entry.id !== id);
  if (next.length === store.announcements.length) return false;
  writeStore({ ...store, announcements: next });
  return true;
}

export function recordToRawTxt(record: AnnouncementRecord): string {
  return serializeAnnouncementTxt(toFormData(record));
}

export function rawTxtToRecord(id: string, raw: string, now: Date = new Date(), createdAt?: string): AnnouncementRecord {
  return toRecord(parseAnnouncementTxt(raw), id, now, createdAt);
}

export function getStorePath(): string {
  return storePath;
}
