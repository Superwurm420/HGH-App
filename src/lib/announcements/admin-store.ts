import { AnnouncementFormData, validateAnnouncementForm } from './editor';
import {
  deleteAnnouncementRecord,
  getAnnouncementRecord,
  listAnnouncementRecords,
  toFormData,
  toRecord,
  upsertAnnouncementRecord,
} from './repository';

export type AdminAnnouncementEntry = {
  id: string;
  file: string;
  data: AnnouncementFormData;
};

function sanitizeBase(base: string): string {
  return (base || 'termin').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'termin';
}

function toFileName(id: string): string {
  return `${id}.txt`;
}

function createIdFromTitle(title: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitizeBase(title)}-${stamp}`;
}

function parseForSorting(date: string): number {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, day, month, year, hour, minute] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

export async function listAdminAnnouncements(): Promise<AdminAnnouncementEntry[]> {
  return (await listAnnouncementRecords())
    .map((record) => ({
      id: record.id,
      file: toFileName(record.id),
      data: toFormData(record),
    }))
    .sort((a, b) => parseForSorting(b.data.date) - parseForSorting(a.data.date));
}

export async function createAdminAnnouncement(data: AnnouncementFormData): Promise<AdminAnnouncementEntry> {
  const issues = validateAnnouncementForm(data);
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  if (hasErrors) {
    throw new Error('Validierung fehlgeschlagen.');
  }

  const id = createIdFromTitle(data.title);
  await upsertAnnouncementRecord(toRecord(data, id));

  return {
    id,
    file: toFileName(id),
    data,
  };
}

export async function updateAdminAnnouncement(id: string, data: AnnouncementFormData): Promise<AdminAnnouncementEntry> {
  const issues = validateAnnouncementForm(data);
  const hasErrors = issues.some((issue) => issue.severity === 'error');
  if (hasErrors) {
    throw new Error('Validierung fehlgeschlagen.');
  }

  const existing = await getAnnouncementRecord(id);
  if (!existing) {
    throw new Error('Eintrag nicht gefunden.');
  }

  await upsertAnnouncementRecord(toRecord(data, id, new Date(), existing.createdAt));

  return { id, file: toFileName(id), data };
}

export async function deleteAdminAnnouncement(id: string): Promise<void> {
  if (!(await deleteAnnouncementRecord(id))) {
    throw new Error('Eintrag nicht gefunden.');
  }
}
