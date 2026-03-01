import fs from 'node:fs';
import path from 'node:path';
import { AnnouncementFormData, parseAnnouncementTxt, serializeAnnouncementTxt, validateAnnouncementForm } from './editor';

export type AdminAnnouncementEntry = {
  id: string;
  file: string;
  data: AnnouncementFormData;
};

const announcementDir = path.join(process.cwd(), 'public/content/announcements');

function ensureDirectory(): void {
  if (!fs.existsSync(announcementDir)) {
    fs.mkdirSync(announcementDir, { recursive: true });
  }
}

function sanitizeBase(base: string): string {
  return (base || 'termin').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'termin';
}

function createFileNameFromTitle(title: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitizeBase(title)}-${stamp}.txt`;
}

function toId(file: string): string {
  return file.replace(/\.txt$/i, '');
}

function fromId(id: string): string {
  return `${sanitizeBase(id)}.txt`;
}

function parseForSorting(date: string): number {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, day, month, year, hour, minute] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

export function listAdminAnnouncements(): AdminAnnouncementEntry[] {
  ensureDirectory();
  const files = fs
    .readdirSync(announcementDir)
    .filter((file) => file.toLowerCase().endsWith('.txt'))
    .sort();

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(announcementDir, file), 'utf8');
      return {
        id: toId(file),
        file,
        data: parseAnnouncementTxt(raw),
      };
    })
    .sort((a, b) => parseForSorting(b.data.date) - parseForSorting(a.data.date));
}

export function createAdminAnnouncement(data: AnnouncementFormData): AdminAnnouncementEntry {
  ensureDirectory();

  const issues = validateAnnouncementForm(data);
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  if (hasErrors) {
    throw new Error('Validierung fehlgeschlagen.');
  }

  const file = createFileNameFromTitle(data.title);
  fs.writeFileSync(path.join(announcementDir, file), serializeAnnouncementTxt(data), 'utf8');

  return {
    id: toId(file),
    file,
    data,
  };
}

export function updateAdminAnnouncement(id: string, data: AnnouncementFormData): AdminAnnouncementEntry {
  ensureDirectory();

  const issues = validateAnnouncementForm(data);
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  if (hasErrors) {
    throw new Error('Validierung fehlgeschlagen.');
  }

  const file = fromId(id);
  const fullPath = path.join(announcementDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error('Eintrag nicht gefunden.');
  }

  fs.writeFileSync(fullPath, serializeAnnouncementTxt(data), 'utf8');

  return { id: toId(file), file, data };
}

export function deleteAdminAnnouncement(id: string): void {
  ensureDirectory();
  const file = fromId(id);
  const fullPath = path.join(announcementDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error('Eintrag nicht gefunden.');
  }
  fs.unlinkSync(fullPath);
}
