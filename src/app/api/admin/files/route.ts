import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import { parseTimetableFilename } from '@/lib/timetable/selectLatest';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';
import {
  listLocalTimetables,
  saveLocalTimetable,
  deleteLocalTimetable,
} from '@/lib/timetable/local-store';
import {
  uploadContent,
  deleteContent,
  listContentItems,
  updateContentItem,
  SupabaseContentError,
} from '@/lib/supabase/content-store';
import type { ContentItemRow } from '@/lib/supabase/db-types';
import { SupabaseConfigurationError } from '@/lib/supabase/client';

export const runtime = 'nodejs';


type ManagedFileEntry = {
  key: string;
  name: string;
  category: 'stundenplan';
  size: number;
  updatedAt: string | null;
};

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

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
  if (error instanceof SupabaseConfigurationError) {
    return NextResponse.json(
      { error: `Server-Konfiguration unvollständig: ${error.variableName} fehlt.` },
      { status: 500 },
    );
  }

  if (error instanceof SupabaseContentError) {
    return NextResponse.json({ error: `Storage-Fehler: ${error.reason}` }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler in der Dateiverwaltung.' }, { status: 500 });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, DELETE, OPTIONS',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  // Lokaler Fallback wenn kein Supabase konfiguriert
  if (!isSupabaseConfigured()) {
    try {
      const localFiles = await listLocalTimetables();
      const filesByCategory = {
        stundenplan: localFiles.map((f) => ({ ...f, category: 'stundenplan' as const })),
      };
      return NextResponse.json({ categories: ['stundenplan'], filesByCategory });
    } catch (error) {
      console.error('[admin/files] Lokaler Store konnte nicht gelesen werden.', error);
      return NextResponse.json({ error: 'Dateien konnten nicht geladen werden.' }, { status: 500 });
    }
  }

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
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Ungültige Formulardaten.' }, { status: 400 });
  }

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

  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  const safeFileName = path.posix.basename(fileName).replace(/\s+/g, '_');
  const key = `${STORAGE_KEYS.timetablesPrefix}${safeFileName}`;
  const uploadedAt = Date.now();
  const timetableMeta = parseTimetableFilename(safeFileName, { lastModifiedMs: uploadedAt });

  // PDF parsen (für beide Speicherpfade benötigt)
  let schedule = null;
  let parsed = false;
  try {
    schedule = await parseTimetablePdfBuffer(new Uint8Array(data));
    parsed = true;
  } catch (parseError) {
    console.warn(`[admin/files] Parsing fehlgeschlagen für ${safeFileName}.`, parseError);
  }

  // Lokaler Fallback wenn kein Supabase konfiguriert
  if (!isSupabaseConfigured()) {
    // parseTimetableFilename gibt null zurück, wenn kein lastModifiedMs und kein Muster erkannt.
    // Da wir lastModifiedMs immer übergeben, ist timetableMeta hier nie null.
    if (!timetableMeta) {
      return NextResponse.json({ error: 'Dateiname konnte nicht verarbeitet werden.' }, { status: 400 });
    }
    try {
      await saveLocalTimetable(safeFileName, data, timetableMeta, schedule);
      invalidateTimetableCache();

      console.info(`[admin/files] Stundenplan lokal gespeichert: ${safeFileName}`);

      const warning = parsed ? null : 'Datei gespeichert, aber der Stundenplan konnte nicht gelesen werden. Bitte PDF-Format prüfen.';
      return NextResponse.json({ ok: true, key, indexed: true, parsed, warning });
    } catch (error) {
      console.error('[admin/files] Lokales Speichern fehlgeschlagen.', error);
      return NextResponse.json({ error: 'Datei konnte nicht lokal gespeichert werden.' }, { status: 500 });
    }
  }

  try {
    await uploadContent({
      key,
      data,
      contentType: 'application/pdf',
      category: 'timetable',
      meta: {
        originalName: fileName,
        timetable: timetableMeta,
      },
    });

    console.info(`[admin/files] Stundenplan hochgeladen: ${key}`);

    const indexed = true;

    try {
      if (schedule) {
        await updateContentItem(key, {
          timetable_json: schedule as unknown as Record<string, unknown>,
          timetable_version: String(uploadedAt),
          meta: {
            originalName: fileName,
            timetable: timetableMeta,
            parsing: { ok: true },
          },
        });
      } else {
        await updateContentItem(key, {
          timetable_json: null,
          timetable_version: null,
          meta: {
            originalName: fileName,
            timetable: timetableMeta,
            parsing: { ok: false },
          },
        });
      }
    } catch (updateError) {
      console.warn(`[admin/files] Metadaten-Update fehlgeschlagen für ${key}.`, updateError);
    }

    invalidateTimetableCache();

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

  const filename = key.slice(STORAGE_KEYS.timetablesPrefix.length);

  // Lokaler Fallback wenn kein Supabase konfiguriert
  if (!isSupabaseConfigured()) {
    try {
      await deleteLocalTimetable(filename);
      invalidateTimetableCache();

      console.info(`[admin/files] Stundenplan lokal gelöscht: ${filename}`);

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('[admin/files] Lokales Löschen fehlgeschlagen.', error);
      return NextResponse.json({ error: 'Datei konnte nicht gelöscht werden.' }, { status: 500 });
    }
  }

  try {
    await deleteContent(key);
    invalidateTimetableCache();

    console.info(`[admin/files] Stundenplan gelöscht: ${key}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleStoreError(error);
  }
}
