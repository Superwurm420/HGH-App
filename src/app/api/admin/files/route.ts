import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ContentStoreConfigurationError, ContentStoreUnavailableError, getContentStore } from '@/lib/storage/content-store';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import { parseUploadedTimetablePdf, removeTimetableIndexEntry, upsertTimetableIndexEntry } from '@/lib/timetable/generated-data';
import { BlobIndexEntry, mutateBlobIndex, readBlobIndex } from '@/lib/storage/blob-index';

type ManagedFileEntry = {
  key: string;
  name: string;
  category: 'stundenplan';
  size: number;
  updatedAt: string | null;
};

function asManagedFile(entry: BlobIndexEntry): ManagedFileEntry {
  return {
    key: entry.pathname,
    name: path.posix.basename(entry.pathname),
    category: 'stundenplan',
    size: entry.size ?? 0,
    updatedAt: entry.uploadedAt ?? null,
  };
}

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: `Storage-Konfiguration ungültig: ${error.reason}` }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler in der Dateiverwaltung.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const index = await readBlobIndex();

    const filesByCategory = {
      stundenplan: index.timetables
        .filter((item) => item.pathname.toLowerCase().endsWith('.pdf'))
        .map((item) => asManagedFile(item))
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
    };

    return NextResponse.json({ categories: ['stundenplan'], filesByCategory });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const category = formData.get('category')?.toString();
  const file = formData.get('file');

  if (category !== 'stundenplan') {
    return NextResponse.json({ error: 'Ungültige Kategorie.' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Datei fehlt.' }, { status: 400 });
  }

  const fileName = file.name.trim();
  if (!fileName) {
    return NextResponse.json({ error: 'Dateiname fehlt.' }, { status: 400 });
  }

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Stundenplan muss eine PDF-Datei sein.' }, { status: 400 });
  }

  const store = getContentStore();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const safeFileName = path.posix.basename(fileName).replace(/\s+/g, '_');
    const key = `${STORAGE_KEYS.timetablesPrefix}${safeFileName}`;
    const putResult = await store.putObject(key, data, 'application/pdf');

    await mutateBlobIndex((index) => {
      const nextEntry: BlobIndexEntry = {
        pathname: key,
        type: 'timetable',
        uploadedAt: putResult.uploadedAt?.toISOString() ?? new Date().toISOString(),
        url: putResult.url,
        originalName: fileName,
        size: putResult.size ?? data.byteLength,
        contentType: putResult.contentType ?? 'application/pdf',
      };

      return {
        ...index,
        timetables: [...index.timetables.filter((entry) => entry.pathname !== key), nextEntry],
      };
    });

    console.info(`[admin/files] Stundenplan hochgeladen und Index aktualisiert: ${key}`);

    let parsed = false;
    let indexed = false;

    try {
      const schedule = await parseUploadedTimetablePdf(data);
      const indexResult = await upsertTimetableIndexEntry({
        filename: safeFileName,
        lastModifiedMs: Date.now(),
        schedule,
      });
      parsed = indexResult.scheduleUpdated;
      indexed = indexResult.metaUpdated;
      if (parsed) {
        invalidateTimetableCache();
      }
    } catch {
      await upsertTimetableIndexEntry({
        filename: safeFileName,
        lastModifiedMs: Date.now(),
      });
      invalidateTimetableCache();
    }

    return NextResponse.json({ ok: true, key, indexed, parsed });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as { category?: string; key?: string };

  if (payload?.category !== 'stundenplan') {
    return NextResponse.json({ error: 'Ungültige Kategorie.' }, { status: 400 });
  }

  const key = payload.key?.trim();
  if (!key || !key.startsWith(STORAGE_KEYS.timetablesPrefix)) {
    return NextResponse.json({ error: 'Ungültiger Stundenplan-Key.' }, { status: 400 });
  }

  const store = getContentStore();

  try {
    const index = await readBlobIndex();
    const existing = index.timetables.find((entry) => entry.pathname === key);

    await store.deleteObject(key, { url: existing?.url });

    await mutateBlobIndex((current) => ({
      ...current,
      timetables: current.timetables.filter((entry) => entry.pathname !== key),
    }));

    const filename = path.posix.basename(key);
    await removeTimetableIndexEntry(filename);
    invalidateTimetableCache();

    console.info(`[admin/files] Stundenplan gelöscht und Index bereinigt: ${key}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleStoreError(error);
  }
}
