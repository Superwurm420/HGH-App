import { describe, expect, it, vi } from 'vitest';

vi.mock('./repository', () => ({
  listAnnouncementRecords: vi.fn(),
  recordToRawTxt: vi.fn(),
}));

vi.mock('./parser', () => ({
  parseAnnouncement: vi.fn(),
  isActive: vi.fn(() => true),
  isVisibleForClass: vi.fn(() => true),
  toSpecialEvent: vi.fn(() => null),
}));

import { getAnnouncements } from './server';
import { listAnnouncementRecords, recordToRawTxt } from './repository';
import { parseAnnouncement } from './parser';

describe('getAnnouncements', () => {
  it('returns an empty list when store loading fails', async () => {
    vi.mocked(listAnnouncementRecords).mockRejectedValue(new Error('store unavailable'));

    await expect(getAnnouncements()).resolves.toEqual([]);
  });

  it('parses records when store data is available', async () => {
    vi.mocked(listAnnouncementRecords).mockResolvedValue([
      {
        id: 'abc',
        title: 'Titel',
        date: '01.01.2026 10:00',
        audience: 'alle',
        classes: [],
        expires: '',
        anzeige: 'nein',
        highlight: false,
        body: 'Body',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    vi.mocked(recordToRawTxt).mockReturnValue('title: Titel\n---\nBody');
    vi.mocked(parseAnnouncement).mockReturnValue({
      file: 'abc.txt',
      title: 'Titel',
      date: '01.01.2026 10:00',
      highlight: false,
      body: 'Body',
      warnings: [],
    });

    await expect(getAnnouncements()).resolves.toEqual([
      {
        file: 'abc.txt',
        title: 'Titel',
        date: '01.01.2026 10:00',
        highlight: false,
        body: 'Body',
        warnings: [],
      },
    ]);
  });
});
