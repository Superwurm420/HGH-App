import { NextResponse } from 'next/server';
import { getContentStore, ContentStoreError } from '@/lib/storage/content-store';

export async function GET(): Promise<NextResponse> {
  try {
    const store = getContentStore();
    const items = await store.listItems();
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    const message = error instanceof ContentStoreError
      ? error.reason
      : 'Index konnte nicht geladen werden.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
