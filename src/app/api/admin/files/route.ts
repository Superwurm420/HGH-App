import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ContentStoreConfigurationError, ContentStoreUnavailableError, getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

type FileCategory = 'stundenplan' | 'kalender' | 'meldungen' | 'ferien';

type ManagedFileEntry = {
  key: string;
  name: string;
  category: FileCategory;
  size: number;
  updatedAt: string | null;
};

type MessagesPayload = {
  standard?: Record<string, unknown>;
  klassen?: Record<string, unknown>;
};

type HolidayPayload = {
  ranges?: Array<{ start?: string; end?: string }>;
};

const CATEGORY_ORDER: FileCategory[] = ['stundenplan', 'kalender', 'meldungen', 'ferien'];

function asManagedFile(category: FileCategory, key: string, size: number, updatedAt: Date | null): ManagedFileEntry {
  return {
    key,
    name: path.posix.basename(key),
    category,
    size,
    updatedAt: updatedAt?.toISOString() ?? null,
  };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateMessagesSchema(raw: string): string | null {
  let data: MessagesPayload;
  try {
    data = JSON.parse(raw) as MessagesPayload;
  } catch {
    return 'Meldungen müssen valides JSON sein.';
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Meldungen müssen ein JSON-Objekt sein.';
  }

  if (!data.standard || typeof data.standard !== 'object' || Array.isArray(data.standard)) {
    return 'Meldungen benötigen ein Objekt unter "standard".';
  }

  if (data.klassen !== undefined && (typeof data.klassen !== 'object' || data.klassen === null || Array.isArray(data.klassen))) {
    return 'Meldungen: "klassen" muss ein Objekt sein.';
  }

  return null;
}

function validateHolidaySchema(raw: string): string | null {
  let data: HolidayPayload;
  try {
    data = JSON.parse(raw) as HolidayPayload;
  } catch {
    return 'Ferien müssen valides JSON sein.';
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Ferien müssen ein JSON-Objekt sein.';
  }

  if (!Array.isArray(data.ranges)) {
    return 'Ferien benötigen ein Array unter "ranges".';
  }

  for (let index = 0; index < data.ranges.length; index += 1) {
    const range = data.ranges[index];
    if (!range || typeof range !== 'object') {
      return `Ferienbereich ${index + 1} ist ungültig.`;
    }

    if (!range.start || !range.end || !isIsoDate(range.start) || !isIsoDate(range.end)) {
      return `Ferienbereich ${index + 1} braucht start/end im Format YYYY-MM-DD.`;
    }

    if (range.start > range.end) {
      return `Ferienbereich ${index + 1} hat start nach end.`;
    }
  }

  return null;
}

function categoryFromValue(value: string | null): FileCategory | null {
  if (value === 'stundenplan' || value === 'kalender' || value === 'meldungen' || value === 'ferien') return value;
  return null;
}

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: 'Storage-Konfiguration fehlt oder ist ungültig.' }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler in der Dateiverwaltung.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  const store = getContentStore();

  try {
    const [timetables, calendar, messages, holidays] = await Promise.all([
      store.list(STORAGE_KEYS.timetablesPrefix),
      store.getObject(STORAGE_KEYS.calendar),
      store.getObject(STORAGE_KEYS.messages),
      store.getObject(STORAGE_KEYS.holidays),
    ]);

    const filesByCategory: Record<FileCategory, ManagedFileEntry[]> = {
      stundenplan: timetables
        .filter((item) => item.key.toLowerCase().endsWith('.pdf'))
        .map((item) => asManagedFile('stundenplan', item.key, item.size, item.updatedAt))
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      kalender: calendar ? [asManagedFile('kalender', STORAGE_KEYS.calendar, calendar.data.byteLength, null)] : [],
      meldungen: messages ? [asManagedFile('meldungen', STORAGE_KEYS.messages, messages.data.byteLength, null)] : [],
      ferien: holidays ? [asManagedFile('ferien', STORAGE_KEYS.holidays, holidays.data.byteLength, null)] : [],
    };

    return NextResponse.json({ categories: CATEGORY_ORDER, filesByCategory });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const category = categoryFromValue(formData.get('category')?.toString() ?? null);
  const file = formData.get('file');

  if (!category) {
    return NextResponse.json({ error: 'Ungültige Kategorie.' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Datei fehlt.' }, { status: 400 });
  }

  const fileName = file.name.trim();
  if (!fileName) {
    return NextResponse.json({ error: 'Dateiname fehlt.' }, { status: 400 });
  }

  const store = getContentStore();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    if (category === 'stundenplan') {
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json({ error: 'Stundenplan muss eine PDF-Datei sein.' }, { status: 400 });
      }

      const key = `${STORAGE_KEYS.timetablesPrefix}${path.posix.basename(fileName).replace(/\s+/g, '_')}`;
      await store.putObject(key, data, 'application/pdf');
      return NextResponse.json({ ok: true, key });
    }

    if (category === 'kalender') {
      if (fileName !== 'kalender.txt') {
        return NextResponse.json({ error: 'Kalender muss als "kalender.txt" hochgeladen werden.' }, { status: 400 });
      }

      await store.putObject(STORAGE_KEYS.calendar, data, 'text/plain; charset=utf-8');
      return NextResponse.json({ ok: true, key: STORAGE_KEYS.calendar });
    }

    const raw = data.toString('utf8');

    if (category === 'meldungen') {
      if (!fileName.toLowerCase().endsWith('.json')) {
        return NextResponse.json({ error: 'Meldungen müssen als .json hochgeladen werden.' }, { status: 400 });
      }

      const validationError = validateMessagesSchema(raw);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      await store.putObject(STORAGE_KEYS.messages, data, 'application/json; charset=utf-8');
      return NextResponse.json({ ok: true, key: STORAGE_KEYS.messages });
    }

    if (!fileName.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ error: 'Ferien müssen als .json hochgeladen werden.' }, { status: 400 });
    }

    const validationError = validateHolidaySchema(raw);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await store.putObject(STORAGE_KEYS.holidays, data, 'application/json; charset=utf-8');
    return NextResponse.json({ ok: true, key: STORAGE_KEYS.holidays });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as { category?: string; key?: string };
  const category = categoryFromValue(payload?.category ?? null);
  if (!category) {
    return NextResponse.json({ error: 'Ungültige Kategorie.' }, { status: 400 });
  }

  const store = getContentStore();

  try {
    if (category === 'stundenplan') {
      const key = payload.key?.trim();
      if (!key || !key.startsWith(STORAGE_KEYS.timetablesPrefix)) {
        return NextResponse.json({ error: 'Ungültiger Stundenplan-Key.' }, { status: 400 });
      }
      await store.deleteObject(key);
      return NextResponse.json({ ok: true });
    }

    const keyByCategory: Record<Exclude<FileCategory, 'stundenplan'>, string> = {
      kalender: STORAGE_KEYS.calendar,
      meldungen: STORAGE_KEYS.messages,
      ferien: STORAGE_KEYS.holidays,
    };

    await store.deleteObject(keyByCategory[category]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleStoreError(error);
  }
}
