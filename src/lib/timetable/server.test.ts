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

import { getLatestTimetable, getWeeklyPlanForClass, invalidateTimetableCache } from './server';

describe('timetable loading from content_items', () => {
  beforeEach(() => {
    invalidateTimetableCache();
    vi.clearAllMocks();
  });

  it('selects latest timetable based on content_items metadata and parsed schedule', async () => {
    mockStore.listItems.mockResolvedValue([
      {
        key: 'timetables/Stundenplan_kw_10_Hj2_2024_25.pdf',
        url: 'https://example.com/old.pdf',
        category: 'timetable',
        content_type: 'application/pdf',
        size: 1,
        created_at: '2025-02-01T09:00:00.000Z',

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
        key: 'timetables/Stundenplan_kw_11_Hj2_2024_25.pdf',
        url: 'https://example.com/new.pdf',
        category: 'timetable',
        content_type: 'application/pdf',
        size: 1,
        created_at: '2025-02-02T09:00:00.000Z',

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
