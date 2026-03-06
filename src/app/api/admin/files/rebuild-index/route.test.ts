import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStore = {
  getObject: vi.fn(),
  putObject: vi.fn(),
  deleteObject: vi.fn(),
  listItems: vi.fn(),
  getItem: vi.fn(),
  updateItem: vi.fn(),
};

vi.mock('@/lib/storage/content-store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage/content-store')>('@/lib/storage/content-store');
  return {
    ...actual,
    getContentStore: () => mockStore,
  };
});

vi.mock('@/lib/timetable/upload-parser', () => ({
  parseTimetablePdfBuffer: vi.fn(),
}));

vi.mock('@/lib/timetable/server', () => ({
  invalidateTimetableCache: vi.fn(),
}));

import { POST } from './route';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import { ContentStoreConfigurationError } from '@/lib/storage/content-store';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';

describe('POST /api/admin/files/rebuild-index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when store configuration is missing', async () => {
    mockStore.listItems.mockRejectedValue(new ContentStoreConfigurationError('SUPABASE_URL fehlt'));

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('Server-Konfiguration unvollständig');
  });

  it('continues on partial failures and returns processed/parsed/failed counts', async () => {
    mockStore.listItems.mockResolvedValue([
      { key: 'timetables/ok.pdf', meta: { source: 'a' } },
      { key: 'timetables/missing.pdf', meta: { source: 'b' } },
      { key: 'timetables/broken.pdf', meta: { source: 'c' } },
      { key: 'timetables/readme.txt', meta: null },
    ]);

    mockStore.getObject
      .mockResolvedValueOnce({ key: 'timetables/ok.pdf', data: Buffer.from([1, 2]), contentType: 'application/pdf' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ key: 'timetables/broken.pdf', data: Buffer.from([3, 4]), contentType: 'application/pdf' });

    vi.mocked(parseTimetablePdfBuffer)
      .mockResolvedValueOnce({ CLS1: { MO: [] } } as never)
      .mockRejectedValueOnce(new Error('cannot parse'));

    mockStore.updateItem.mockResolvedValue(undefined);

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.counts).toEqual({ processed: 3, parsed: 1, failed: 2, total: 3 });

    expect(mockStore.getObject).toHaveBeenCalledTimes(3);
    expect(parseTimetablePdfBuffer).toHaveBeenCalledTimes(2);
    expect(mockStore.updateItem).toHaveBeenCalledTimes(3);
    expect(invalidateTimetableCache).toHaveBeenCalledTimes(1);
  });
});
