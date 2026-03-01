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

const storeDir = path.join(process.cwd(), 'data');
const storePath = path.join(storeDir, 'announcements-store.json');

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

function parseClasses(value: string): string[] {
  return [...new Set(value.split(/[;,/|\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function serializeClasses(value: string[]): string {
  return value.join(', ');
}

function readStore(): AnnouncementStorePayload {
  ensureStoreExists();

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AnnouncementStorePayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.announcements)) {
      throw new Error('Ungültiges Store-Format.');
    }
    return {
      version: 1,
      announcements: parsed.announcements.filter((entry): entry is AnnouncementRecord => Boolean(entry && entry.id)),
    };
  } catch {
    return { version: 1, announcements: [] };
  }
}

function writeStore(payload: AnnouncementStorePayload): void {
  ensureStoreExists();
  fs.writeFileSync(storePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
