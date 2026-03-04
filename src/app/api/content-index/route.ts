import { NextResponse } from 'next/server';
import { listContentItems, SupabaseContentError } from '@/lib/supabase/content-store';

export async function GET(): Promise<NextResponse> {
  try {
    const items = await listContentItems();
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    const message = error instanceof SupabaseContentError
      ? error.reason
      : 'Index konnte nicht geladen werden.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
