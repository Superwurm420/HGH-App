import { NextResponse } from 'next/server';
import { ContentStoreConfigurationError, ContentStoreUnavailableError, getContentStore } from '@/lib/storage/content-store';
import { mutateBlobIndex } from '@/lib/storage/blob-index';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';

const IMAGE_PREFIX = 'images/';
const ANNOUNCEMENT_PREFIX = 'announcements/';

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: `Storage-Konfiguration ungültig: ${error.reason}` }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Index konnte nicht neu aufgebaut werden.' }, { status: 500 });
}

export async function POST(): Promise<NextResponse> {
  const store = getContentStore();

  try {
    const [timetables, announcements, images] = await Promise.all([
      store.list(STORAGE_KEYS.timetablesPrefix),
      store.list(ANNOUNCEMENT_PREFIX),
      store.list(IMAGE_PREFIX),
    ]);

    const next = await mutateBlobIndex((index) => ({
      ...index,
      timetables: timetables
        .filter((entry) => entry.key.toLowerCase().endsWith('.pdf'))
        .map((entry) => ({
          pathname: entry.key,
          type: 'timetable' as const,
          uploadedAt: entry.updatedAt?.toISOString() ?? new Date().toISOString(),
          size: entry.size,
          contentType: entry.contentType ?? 'application/pdf',
        })),
      announcements: announcements
        .filter((entry) => entry.key.toLowerCase().endsWith('.txt'))
        .map((entry) => ({
          pathname: entry.key,
          type: 'announcement' as const,
          uploadedAt: entry.updatedAt?.toISOString() ?? new Date().toISOString(),
          size: entry.size,
          contentType: entry.contentType ?? 'text/plain',
        })),
      images: images
        .filter((entry) => /\.(png|jpe?g)$/i.test(entry.key))
        .map((entry) => ({
          pathname: entry.key,
          type: 'image' as const,
          uploadedAt: entry.updatedAt?.toISOString() ?? new Date().toISOString(),
          size: entry.size,
          contentType: entry.contentType ?? undefined,
        })),
    }));

    console.info('[admin/files] Blob-Index neu aufgebaut.');

    return NextResponse.json({
      ok: true,
      counts: {
        timetables: next.timetables.length,
        announcements: next.announcements.length,
        images: next.images.length,
      },
    });
  } catch (error) {
    return handleStoreError(error);
  }
}
