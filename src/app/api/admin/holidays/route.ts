import { NextRequest, NextResponse } from 'next/server';
import { getSchoolHolidays, saveSchoolHolidays } from '@/lib/holidays/server';
import { validateHolidayRanges } from '@/lib/validation/content-schemas';
import { ContentStoreConfigurationError, ContentStoreUnavailableError } from '@/lib/storage/content-store';

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: `Storage-Konfiguration ungültig: ${error.reason}` }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler beim Zugriff auf Ferien-Daten.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const ranges = await getSchoolHolidays();
    return NextResponse.json({ ranges });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let payload: { ranges?: unknown };
  try {
    payload = (await request.json()) as { ranges?: unknown };
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON.' }, { status: 400 });
  }

  const validationError = validateHolidayRanges(payload.ranges);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ranges = payload.ranges as Array<{ start: string; end: string }>;

  try {
    await saveSchoolHolidays(ranges);
    return NextResponse.json({ ok: true, ranges });
  } catch (error) {
    return handleStoreError(error);
  }
}
