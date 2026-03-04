import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/content-store', () => ({
  listContentItems: vi.fn(),
}));

import { listContentItems } from '@/lib/supabase/content-store';
import { getLatestTimetable, getWeeklyPlanForClass, invalidateTimetableCache } from './server';

describe('timetable loading from content_items', () => {
  beforeEach(() => {
    invalidateTimetableCache();
    vi.clearAllMocks();
  });

  it('selects latest timetable based on content_items metadata and parsed schedule', async () => {
    vi.mocked(listContentItems).mockResolvedValue([
      {
        id: '1',
        key: 'timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
        url: 'https://example.com/old.pdf',
        category: 'timetable',
        content_type: 'application/pdf',
        size: 1,
        created_at: '2025-02-01T09:00:00.000Z',
        hash: null,
        meta: {
          timetable: {
            filename: 'Stundenplan_kw_10_Hj2_2024_25.pdf',
            kw: 10,
            halfYear: 2,
            yearStart: 2024,
            yearEndShort: 25,
            href: '/content/timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
            source: 'name-pattern',
            lastModifiedMs: Date.parse('2025-02-01T09:00:00.000Z'),
          },
        },
        timetable_json: {
          HT11: { MO: [{ period: 1, time: '08:00 - 08:45', subject: 'Alt' }], DI: [], MI: [], DO: [], FR: [] },
        },
        timetable_version: 'v1',
      },
      {
        id: '2',
        key: 'timetables/Stundenplan_kw_11_Hj2_2024_25.pdf',
        url: 'https://example.com/new.pdf',
        category: 'timetable',
        content_type: 'application/pdf',
        size: 1,
        created_at: '2025-02-02T09:00:00.000Z',
        hash: null,
        meta: {
          timetable: {
            filename: 'Stundenplan_kw_11_Hj2_2024_25.pdf',
            kw: 11,
            halfYear: 2,
            yearStart: 2024,
            yearEndShort: 25,
            href: '/content/timetables/Stundenplan_kw_11_Hj2_2024_25.pdf',
            source: 'name-pattern',
            lastModifiedMs: Date.parse('2025-02-02T09:00:00.000Z'),
          },
        },
        timetable_json: {
          HT11: { MO: [{ period: 1, time: '08:00 - 08:45', subject: 'Neu' }], DI: [], MI: [], DO: [], FR: [] },
        },
        timetable_version: 'v2',
      },
    ]);

    const latest = await getLatestTimetable();
    const weekly = await getWeeklyPlanForClass('HT11');

    expect(latest?.filename).toBe('Stundenplan_kw_11_Hj2_2024_25.pdf');
    expect(weekly?.week.MO[0]?.subject).toBe('Neu');
  });
});
