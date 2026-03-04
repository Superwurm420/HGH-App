import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_KEYS } from '@/lib/storage/object-keys';
import { getContentItem } from '@/lib/supabase/content-store';
import { downloadFromStorage } from '@/lib/supabase/content-store';

type Params = {
  filename: string;
};

function resolveFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded || decoded.includes('/') || decoded.includes('\\')) return null;
  if (!decoded.toLowerCase().endsWith('.pdf')) return null;
  return decoded;
}

export async function GET(_request: NextRequest, context: { params: Promise<Params> }): Promise<NextResponse> {
  const { filename: rawFilename } = await context.params;
  const filename = resolveFilename(rawFilename);

  if (!filename) {
    return NextResponse.json({ error: 'Ungültiger Dateiname.' }, { status: 400 });
  }

  const key = `${STORAGE_KEYS.timetablesPrefix}${filename}`;

  try {
    const item = await getContentItem(key);
    if (item?.url) {
      return NextResponse.redirect(item.url, { status: 302 });
    }

    const result = await downloadFromStorage(key);
    if (!result) {
      return NextResponse.json({ error: 'Datei nicht gefunden.' }, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', result.contentType ?? 'application/pdf');
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);

    return new NextResponse(result.data, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'Datei konnte nicht geladen werden.' }, { status: 503 });
  }
}
