import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementFormData, validateAnnouncementForm } from '@/lib/announcements/editor';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  listAdminAnnouncements,
  updateAdminAnnouncement,
} from '@/lib/announcements/admin-store';

type AnnouncementPayload = {
  id?: string;
  data?: AnnouncementFormData;
};

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ files: listAdminAnnouncements() });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as AnnouncementPayload;
  if (!payload?.data) {
    return NextResponse.json({ error: 'Ungültige Daten.' }, { status: 400 });
  }

  const issues = validateAnnouncementForm(payload.data);
  if (issues.some((issue) => issue.severity === 'error')) {
    return NextResponse.json({ error: 'Validierung fehlgeschlagen.', issues }, { status: 400 });
  }

  const entry = createAdminAnnouncement(payload.data);
  return NextResponse.json({ entry });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as AnnouncementPayload;
  if (!payload?.id || !payload?.data) {
    return NextResponse.json({ error: 'Ungültige Daten.' }, { status: 400 });
  }

  const issues = validateAnnouncementForm(payload.data);
  if (issues.some((issue) => issue.severity === 'error')) {
    return NextResponse.json({ error: 'Validierung fehlgeschlagen.', issues }, { status: 400 });
  }

  try {
    const entry = updateAdminAnnouncement(payload.id, payload.data);
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Speichern fehlgeschlagen.' },
      { status: 404 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as AnnouncementPayload;
  if (!payload?.id) {
    return NextResponse.json({ error: 'Ungültige Daten.' }, { status: 400 });
  }

  try {
    deleteAdminAnnouncement(payload.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Löschen fehlgeschlagen.' }, { status: 404 });
  }
}
