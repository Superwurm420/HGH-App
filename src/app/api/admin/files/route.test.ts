import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/content-store', () => ({
  uploadContent: vi.fn(),
  updateContentItem: vi.fn(),
  deleteContent: vi.fn(),
  listContentItems: vi.fn(),
  SupabaseContentError: class SupabaseContentError extends Error {
    reason: string;
    constructor(reason: string) {
      super(reason);
      this.reason = reason;
    }
  },
}));

vi.mock('@/lib/timetable/server', () => ({
  invalidateTimetableCache: vi.fn(),
}));

vi.mock('@/lib/timetable/upload-parser', () => ({
  parseTimetablePdfBuffer: vi.fn(),
}));

import { POST } from './route';
import { uploadContent, updateContentItem } from '@/lib/supabase/content-store';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';

describe('POST /api/admin/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with warning when parsing fails but storage/index update succeed', async () => {
    vi.mocked(uploadContent).mockResolvedValue({} as never);
    vi.mocked(updateContentItem).mockResolvedValue({} as never);
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
    expect(uploadContent).toHaveBeenCalledTimes(1);
    expect(updateContentItem).toHaveBeenCalledTimes(1);
  });
});
