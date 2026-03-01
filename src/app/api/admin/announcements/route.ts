import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  AnnouncementFormData,
  getDefaultAnnouncementFormData,
  parseAnnouncementTxt,
  serializeAnnouncementTxt,
  validateAnnouncementForm,
} from '@/lib/announcements/editor';

const announcementDir = path.join(process.cwd(), 'public/content/announcements');

type SavePayload = {
  filename: string;
  data: AnnouncementFormData;
};

function ensureDirectory(): void {
  if (!fs.existsSync(announcementDir)) {
    fs.mkdirSync(announcementDir, { recursive: true });
  }
}

function sanitizeFilename(filename: string): string {
  const base = filename.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  return (base || 'announcement') + '.txt';
}

export async function GET(): Promise<NextResponse> {
  ensureDirectory();
  const files = fs.readdirSync(announcementDir).filter((file) => file.toLowerCase().endsWith('.txt')).sort();

  const entries = files.map((file) => {
    const raw = fs.readFileSync(path.join(announcementDir, file), 'utf8');
    const parsed = parseAnnouncementTxt(raw);
    const issues = validateAnnouncementForm(parsed);
    return {
      file,
      raw,
      parsed,
      issues,
    };
  });

  return NextResponse.json({
    files: entries,
    template: getDefaultAnnouncementFormData(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureDirectory();

  const payload = (await request.json()) as SavePayload;

  if (!payload?.filename || !payload?.data) {
    return NextResponse.json({ error: 'Ungültige Daten.' }, { status: 400 });
  }

  const filename = sanitizeFilename(payload.filename);
  const issues = validateAnnouncementForm(payload.data);
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  if (hasErrors) {
    return NextResponse.json({ error: 'Validierung fehlgeschlagen.', issues }, { status: 400 });
  }

  const raw = serializeAnnouncementTxt(payload.data);
  fs.writeFileSync(path.join(announcementDir, filename), raw, 'utf8');

  return NextResponse.json({
    file: filename,
    raw,
    issues,
  });
}
