import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

import { GET, POST } from './route';
import { uploadContent, updateContentItem, listContentItems } from '@/lib/supabase/content-store';
import { parseTimetablePdfBuffer } from '@/lib/timetable/upload-parser';
import { SupabaseConfigurationError } from '@/lib/supabase/client';

describe('POST /api/admin/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });



  it('returns 500 with a clear message when Supabase environment configuration is missing', async () => {
    vi.mocked(listContentItems).mockRejectedValue(new SupabaseConfigurationError('SUPABASE_URL'));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('Server-Konfiguration unvollständig');
    expect(payload.error).toContain('SUPABASE_URL');
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
