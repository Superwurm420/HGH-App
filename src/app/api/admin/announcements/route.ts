import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementFormData, validateAnnouncementForm } from '@/lib/announcements/editor';
import { createAdminAnnouncement, deleteAdminAnnouncement, listAdminAnnouncements, updateAdminAnnouncement } from '@/lib/announcements/admin-store';
import { AnnouncementStoreReadError, AnnouncementStoreWriteError } from '@/lib/announcements/repository';
import { ContentStoreConfigurationError, ContentStoreUnavailableError } from '@/lib/storage/content-store';

export const runtime = 'nodejs';

type AnnouncementPayload = {
  id?: string;
  data?: AnnouncementFormData;
};

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json(
      {
        error: `Storage-Konfiguration ungültig: ${error.reason}`,
      },
      { status: 500 },
    );
  }

  if (error instanceof ContentStoreUnavailableError || error instanceof AnnouncementStoreWriteError) {
    return NextResponse.json(
      {
        error: 'Der Storage-Dienst ist aktuell nicht erreichbar. Bitte später erneut versuchen.',
      },
      { status: 503 },
    );
  }

  if (error instanceof AnnouncementStoreReadError) {
    return NextResponse.json(
      {
        error: 'Die gespeicherten Termine können nicht gelesen werden (Datenformat oder Storage-Inhalt defekt).',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: 'Interner Fehler beim Zugriff auf Termine.' }, { status: 500 });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, PUT, DELETE, OPTIONS',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ files: await listAdminAnnouncements() });
  } catch (error) {
    return handleStoreError(error);
  }
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

  try {
    const entry = await createAdminAnnouncement(payload.data);
    return NextResponse.json({ entry });
  } catch (error) {
    return handleStoreError(error);
  }
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
    const entry = await updateAdminAnnouncement(payload.id, payload.data);
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof Error && error.message === 'Eintrag nicht gefunden.') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return handleStoreError(error);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const payload = (await request.json()) as AnnouncementPayload;
  if (!payload?.id) {
    return NextResponse.json({ error: 'Ungültige Daten.' }, { status: 400 });
  }

  try {
    await deleteAdminAnnouncement(payload.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Eintrag nicht gefunden.') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return handleStoreError(error);
  }
}
