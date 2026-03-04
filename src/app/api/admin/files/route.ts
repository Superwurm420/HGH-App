import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import { parseUploadedTimetablePdf, removeTimetableIndexEntry, upsertTimetableIndexEntry } from '@/lib/timetable/generated-data';
import {
  uploadContent,
  deleteContent,
  listContentItems,
  updateContentItem,
  SupabaseContentError,
} from '@/lib/supabase/content-store';
import type { ContentItemRow } from '@/lib/supabase/db-types';


type ManagedFileEntry = {
  key: string;
  name: string;
  category: 'stundenplan';
  size: number;
  updatedAt: string | null;
};

function asManagedFile(item: ContentItemRow): ManagedFileEntry {
  return {
    key: item.key,
    name: path.posix.basename(item.key),
    category: 'stundenplan',
    size: item.size ?? 0,
    updatedAt: item.created_at ?? null,
  };
}

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof SupabaseContentError) {
    return NextResponse.json({ error: `Storage-Fehler: ${error.reason}` }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler in der Dateiverwaltung.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const items = await listContentItems('timetable');

    const filesByCategory = {
      stundenplan: items
        .filter((item) => item.key.toLowerCase().endsWith('.pdf'))
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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const safeFileName = path.posix.basename(fileName).replace(/\s+/g, '_');
    const key = `${STORAGE_KEYS.timetablesPrefix}${safeFileName}`;

    await uploadContent({
      key,
      data,
      contentType: 'application/pdf',
      category: 'timetable',
      meta: { originalName: fileName },
    });

    console.info(`[admin/files] Stundenplan hochgeladen: ${key}`);

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
        await updateContentItem(key, {
          timetable_json: schedule as unknown as Record<string, unknown>,
          timetable_version: String(Date.now()),
        });
        invalidateTimetableCache();
      }
    } catch {
      await upsertTimetableIndexEntry({
        filename: safeFileName,
        lastModifiedMs: Date.now(),
      });
      invalidateTimetableCache();
    }

    const warning = parsed ? null : 'Datei gespeichert, aber der Stundenplan konnte nicht gelesen werden. Bitte PDF-Format prüfen.';
    return NextResponse.json({ ok: true, key, indexed, parsed, warning });
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

  try {
    await deleteContent(key);

    const filename = path.posix.basename(key);
    await removeTimetableIndexEntry(filename);
    invalidateTimetableCache();

    console.info(`[admin/files] Stundenplan gelöscht: ${key}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleStoreError(error);
  }
}
