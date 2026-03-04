import { NextResponse } from 'next/server';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';
import {
  listContentItems,
  downloadFromStorage,
  updateContentItem,
  SupabaseContentError,
} from '@/lib/supabase/content-store';

export async function POST(): Promise<NextResponse> {
  try {
    const items = await listContentItems('timetable');
    const pdfItems = items.filter((item) => item.key.toLowerCase().endsWith('.pdf'));

    let processed = 0;
    let parsed = 0;
    let failed = 0;

    for (const item of pdfItems) {
      processed += 1;

      try {
        const file = await downloadFromStorage(item.key);
        if (!file) {
          failed += 1;
          await updateContentItem(item.key, {
            timetable_json: null,
            timetable_version: null,
            meta: {
              ...(item.meta ?? {}),
              parsing: { ok: false, reason: 'missing-file' },
            },
          });
          continue;
        }

        const schedule = await parseTimetablePdfBuffer(new Uint8Array(file.data));
        await updateContentItem(item.key, {
          timetable_json: schedule as unknown as Record<string, unknown>,
          timetable_version: String(Date.now()),
          meta: {
            ...(item.meta ?? {}),
            parsing: { ok: true },
          },
        });
        parsed += 1;
      } catch (error) {
        failed += 1;
        console.warn(`[admin/files] Rebuild Parsing fehlgeschlagen für ${item.key}.`, error);
        await updateContentItem(item.key, {
          timetable_json: null,
          timetable_version: null,
          meta: {
            ...(item.meta ?? {}),
            parsing: { ok: false },
          },
        }).catch((metaError) => {
          console.warn(`[admin/files] Rebuild-Status konnte nicht gespeichert werden für ${item.key}.`, metaError);
        });
      }
    }

    invalidateTimetableCache();

    const counts = { processed, parsed, failed, total: pdfItems.length };

    console.info('[admin/files] Content-Index abgefragt.', counts);

    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    if (error instanceof SupabaseContentError) {
      return NextResponse.json({ error: `Storage-Fehler: ${error.reason}` }, { status: 503 });
    }
    return NextResponse.json({ error: 'Index konnte nicht geladen werden.' }, { status: 500 });
  }
}
