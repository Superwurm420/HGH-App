/**
 * Lokaler Fallback-Store für Stundenplan-PDFs und geparste Stundenplandaten.
 *
 * Wird verwendet, wenn Supabase nicht konfiguriert ist (z.B. lokale Entwicklung
 * oder Deployment ohne Supabase). PDFs werden in public/content/timetables/ gespeichert,
 * Metadaten und geparste Daten in data/timetable-store.json.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ParsedSchedule, TimetableMeta } from './types';

type LocalTimetableStore = {
  version: 1;
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
};

function storePath(): string {
  return path.join(process.cwd(), 'data', 'timetable-store.json');
}

export function timetablesDir(): string {
  return path.join(process.cwd(), 'public', 'content', 'timetables');
}

async function readStore(): Promise<LocalTimetableStore> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalTimetableStore>;
    if (parsed.version === 1 && Array.isArray(parsed.files)) {
      return parsed as LocalTimetableStore;
    }
  } catch {
    // Store nicht vorhanden oder ungültig → leer zurückgeben
  }
  return { version: 1, files: [], schedules: {} };
}

async function writeStore(store: LocalTimetableStore): Promise<void> {
  await fs.mkdir(path.dirname(storePath()), { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2) + '\n', 'utf8');
}

export type LocalTimetableEntry = {
  key: string;
  name: string;
  size: number;
  updatedAt: string | null;
};

export async function listLocalTimetables(): Promise<LocalTimetableEntry[]> {
  const store = await readStore();
  const entries: LocalTimetableEntry[] = [];

  for (const file of store.files) {
    const filePath = path.join(timetablesDir(), file.filename);
    let size = 0;
    try {
      const stat = await fs.stat(filePath);
      size = stat.size;
    } catch {
      // Datei existiert möglicherweise nicht mehr
    }
    entries.push({
      key: `timetables/${file.filename}`,
      name: file.filename,
      size,
      updatedAt: typeof file.lastModifiedMs === 'number' ? new Date(file.lastModifiedMs).toISOString() : null,
    });
  }

  return entries;
}

export async function saveLocalTimetable(
  filename: string,
  data: Buffer,
  meta: TimetableMeta,
  schedule: ParsedSchedule | null,
): Promise<void> {
  // PDF in public-Verzeichnis speichern
  const destPath = path.join(timetablesDir(), filename);
  await fs.mkdir(timetablesDir(), { recursive: true });
  await fs.writeFile(destPath, data);

  // Store aktualisieren
  const store = await readStore();
  const index = store.files.findIndex((f) => f.filename === filename);
  if (index >= 0) {
    store.files[index] = meta;
  } else {
    store.files.push(meta);
  }

  if (schedule) {
    store.schedules[filename] = schedule;
  } else {
    delete store.schedules[filename];
  }

  await writeStore(store);
}

export async function deleteLocalTimetable(filename: string): Promise<void> {
  // PDF aus public-Verzeichnis entfernen
  const filePath = path.join(timetablesDir(), filename);
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // Ignorieren, falls Datei nicht existiert
  }

  // Store aktualisieren
  const store = await readStore();
  store.files = store.files.filter((f) => f.filename !== filename);
  delete store.schedules[filename];
  await writeStore(store);
}

export async function getLocalTimetableData(): Promise<{
  files: TimetableMeta[];
  schedules: Record<string, ParsedSchedule>;
}> {
  const store = await readStore();
  return { files: store.files, schedules: store.schedules };
}
