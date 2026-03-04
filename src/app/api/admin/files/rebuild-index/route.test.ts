import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {
    variableName: string;
    constructor(variableName: string) {
      super(`Fehlende oder leere Umgebungsvariable: ${variableName}`);
      this.variableName = variableName;
    }
  },
}));

vi.mock('@/lib/supabase/content-store', () => ({
  listContentItems: vi.fn(),
  downloadFromStorage: vi.fn(),
  updateContentItem: vi.fn(),
  SupabaseContentError: class SupabaseContentError extends Error {
    reason: string;
    constructor(reason: string) {
      super(reason);
      this.reason = reason;
    }
  },
}));

vi.mock('@/lib/timetable/upload-parser', () => ({
  parseTimetablePdfBuffer: vi.fn(),
}));

vi.mock('@/lib/timetable/server', () => ({
  invalidateTimetableCache: vi.fn(),
}));

import { POST } from './route';
import { invalidateTimetableCache } from '@/lib/timetable/server';
import {
  downloadFromStorage,
  listContentItems,
  updateContentItem,
} from '@/lib/supabase/content-store';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';
import { SupabaseConfigurationError } from '@/lib/supabase/client';

describe('POST /api/admin/files/rebuild-index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when Supabase configuration is missing', async () => {
    vi.mocked(listContentItems).mockRejectedValue(new SupabaseConfigurationError('SUPABASE_SERVICE_ROLE_KEY'));

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('Server-Konfiguration unvollständig');
    expect(payload.error).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('continues on partial failures and returns processed/parsed/failed counts', async () => {
    vi.mocked(listContentItems).mockResolvedValue([
      { key: 'timetables/ok.pdf', meta: { source: 'a' } },
      { key: 'timetables/missing.pdf', meta: { source: 'b' } },
      { key: 'timetables/broken.pdf', meta: { source: 'c' } },
      { key: 'timetables/readme.txt', meta: null },
    ] as never);

    vi.mocked(downloadFromStorage)
      .mockResolvedValueOnce({ data: Buffer.from([1, 2]), contentType: 'application/pdf' } as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: Buffer.from([3, 4]), contentType: 'application/pdf' } as never);

    vi.mocked(parseTimetablePdfBuffer)
      .mockResolvedValueOnce({ CLS1: { MO: [] } } as never)
      .mockRejectedValueOnce(new Error('cannot parse'));

    vi.mocked(updateContentItem).mockResolvedValue({} as never);

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.counts).toEqual({ processed: 3, parsed: 1, failed: 2, total: 3 });

    expect(downloadFromStorage).toHaveBeenCalledTimes(3);
    expect(parseTimetablePdfBuffer).toHaveBeenCalledTimes(2);
    expect(updateContentItem).toHaveBeenCalledTimes(3);
    expect(invalidateTimetableCache).toHaveBeenCalledTimes(1);
  });
});
