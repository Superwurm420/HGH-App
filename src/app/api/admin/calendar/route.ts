import { NextRequest, NextResponse } from 'next/server';
import { getCalendarUrls, saveCalendarUrls } from '@/lib/calendar/server';
import { ContentStoreConfigurationError, ContentStoreUnavailableError } from '@/lib/storage/content-store';
import { toGoogleCalendarEmbedUrls } from '@/lib/calendar/url-normalization';

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: `Storage-Konfiguration ungültig: ${error.reason}` }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler beim Zugriff auf Kalender-Daten.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const urls = await getCalendarUrls();
    return NextResponse.json({ urls });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let payload: { urls?: unknown };
  try {
    payload = (await request.json()) as { urls?: unknown };
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON.' }, { status: 400 });
  }

  if (!Array.isArray(payload.urls)) {
    return NextResponse.json({ error: '"urls" muss ein Array sein.' }, { status: 400 });
  }

  const rawUrls = payload.urls.filter((url): url is string => typeof url === 'string');
  const urls = toGoogleCalendarEmbedUrls(rawUrls);

  if (rawUrls.length > 0 && urls.length === 0) {
    return NextResponse.json({ error: 'Keine gültigen Google-Kalender-Links oder Kalender-IDs übergeben.' }, { status: 400 });
  }

  try {
    await saveCalendarUrls(urls);
    return NextResponse.json({ ok: true, urls });
  } catch (error) {
    return handleStoreError(error);
  }
}
