import { NextRequest, NextResponse } from 'next/server';
import { type MessagesData, getMessages, saveMessages } from '@/lib/messages/server';
import { validateMessagesData } from '@/lib/validation/content-schemas';
import { ContentStoreConfigurationError, ContentStoreUnavailableError } from '@/lib/storage/content-store';

function handleStoreError(error: unknown): NextResponse {
  if (error instanceof ContentStoreConfigurationError) {
    return NextResponse.json({ error: 'Storage-Konfiguration fehlt oder ist ungültig.' }, { status: 500 });
  }

  if (error instanceof ContentStoreUnavailableError) {
    return NextResponse.json({ error: 'Storage aktuell nicht erreichbar.' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Interner Fehler beim Zugriff auf Meldungen-Daten.' }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const messages = await getMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    return handleStoreError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let payload: { messages?: unknown };
  try {
    payload = (await request.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON.' }, { status: 400 });
  }

  const validationError = validateMessagesData(payload.messages);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const data = payload.messages as MessagesData;

  try {
    await saveMessages(data);
    const messages = await getMessages();
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return handleStoreError(error);
  }
}
