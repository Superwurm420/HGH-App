import { NextResponse } from 'next/server';
import { readBlobIndex } from '@/lib/storage/blob-index';

export async function GET(): Promise<NextResponse> {
  try {
    const index = await readBlobIndex();
    return NextResponse.json(index, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Index konnte nicht geladen werden.' }, { status: 503 });
  }
}
