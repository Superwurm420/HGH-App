import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

vi.mock('@/lib/timetable/server', () => ({
  invalidateTimetableCache: vi.fn(),
}));

vi.mock('@/lib/timetable/upload-parser', () => ({
  parseTimetablePdfBuffer: vi.fn(),
}));

import { GET, POST } from './route';
import { ContentStoreConfigurationError } from '@/lib/storage/content-store';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';

describe('POST /api/admin/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 with a clear message when store configuration is missing', async () => {
    mockStore.listItems.mockRejectedValue(new ContentStoreConfigurationError('SUPABASE_URL fehlt'));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('Server-Konfiguration unvollständig');
  });

  it('returns success with warning when parsing fails but storage/index update succeed', async () => {
    mockStore.putObject.mockResolvedValue({ key: 'timetables/test.pdf' });
    mockStore.updateItem.mockResolvedValue(undefined);
    vi.mocked(parseTimetablePdfBuffer).mockRejectedValue(new Error('broken pdf'));

    const form = new FormData();
    form.set('category', 'stundenplan');
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'Stundenplan_kw_11_Hj2_2024_25.pdf', { type: 'application/pdf' }));

    const request = new NextRequest('http://localhost/api/admin/files', {
      method: 'POST',
      body: form,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.parsed).toBe(false);
    expect(payload.indexed).toBe(true);
    expect(payload.warning).toContain('Datei gespeichert');
    expect(mockStore.putObject).toHaveBeenCalledTimes(1);
    expect(mockStore.updateItem).toHaveBeenCalledTimes(1);
  });
});
