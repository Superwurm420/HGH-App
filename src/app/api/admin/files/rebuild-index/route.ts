import { NextResponse } from 'next/server';
import { listContentItems, SupabaseContentError } from '@/lib/supabase/content-store';

export async function POST(): Promise<NextResponse> {
  try {
    const items = await listContentItems();

    const counts = {
      timetables: items.filter((item) => item.category === 'timetable').length,
      announcements: items.filter((item) => item.category === 'announcement').length,
      images: items.filter((item) => item.category === 'image').length,
      config: items.filter((item) => item.category === 'config').length,
      total: items.length,
    };

    console.info('[admin/files] Content-Index abgefragt.', counts);

    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    if (error instanceof SupabaseContentError) {
      return NextResponse.json({ error: `Storage-Fehler: ${error.reason}` }, { status: 503 });
    }
    return NextResponse.json({ error: 'Index konnte nicht geladen werden.' }, { status: 500 });
  }
}
