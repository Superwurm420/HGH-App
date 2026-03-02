import { NextRequest, NextResponse } from 'next/server';
import { AnnouncementFormData, validateAnnouncementForm } from '@/lib/announcements/editor';
import { createAdminAnnouncement, deleteAdminAnnouncement, listAdminAnnouncements, updateAdminAnnouncement } from '@/lib/announcements/admin-store';
import { AnnouncementStoreReadError, isFileSystemAccessError } from '@/lib/announcements/repository';

type AnnouncementPayload = {
  id?: string;
  data?: AnnouncementFormData;
};

function handleStoreError(error: unknown): NextResponse {
  if (isFileSystemAccessError(error)) {
    return NextResponse.json(
      {
        error:
          'Der Server kann aktuell nicht auf den Speicher schreiben (Dateisystem ist nicht beschreibbar). Bitte Hosting/Storage-Konfiguration prüfen.',
      },
      { status: 500 },
    );
  }

  if (error instanceof AnnouncementStoreReadError) {
    return NextResponse.json(
      {
        error:
          'Die gespeicherten Termine sind defekt und wurden in Quarantäne verschoben. Bitte Backup prüfen und Datensatz neu aufbauen.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ error: 'Interner Fehler beim Zugriff auf Termine.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ files: listAdminAnnouncements() });
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
    const entry = createAdminAnnouncement(payload.data);
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
    const entry = updateAdminAnnouncement(payload.id, payload.data);
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof AnnouncementStoreReadError) {
      return handleStoreError(error);
    }
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
    if (error instanceof AnnouncementStoreReadError) {
      return handleStoreError(error);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Löschen fehlgeschlagen.' }, { status: 404 });
  }
}
