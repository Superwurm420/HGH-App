import { LessonEntry, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

/** Extract the start time from a time range like "8.00 - 8.45" → "8:00" */
function timeStart(time: string): string {
  return time.split('-')[0].trim().replace('.', ':');
}

type PeriodSlot = {
  period: number;
  periodEnd?: number;
  time: string;
};

/**
 * Collect all unique period slots across every weekday.
 * Merged periods (1+2) produce a single slot with periodEnd.
 */
function collectPeriodSlots(week: WeekPlan): PeriodSlot[] {
  const seen = new Map<number, PeriodSlot>();

  for (const day of WEEKDAYS) {
    for (const lesson of week[day]) {
      const key = lesson.period;
      if (!seen.has(key)) {
        seen.set(key, {
          period: lesson.period,
          periodEnd: lesson.periodEnd,
          time: lesson.time,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.period - b.period);
}

/** Find the lesson for a given day and period slot. */
function findLesson(lessons: LessonEntry[], slot: PeriodSlot): LessonEntry | undefined {
  return lessons.find((l) => l.period === slot.period);
}

/** Set of periods that are covered by a previous double-period and should be skipped. */
function getSkippedPeriods(lessons: LessonEntry[]): Set<number> {
  const skipped = new Set<number>();
  for (const l of lessons) {
    if (l.periodEnd) {
      for (let p = l.period + 1; p <= l.periodEnd; p++) {
        skipped.add(p);
      }
    }
  }
  return skipped;
}

export function WeekSchedule({
  week,
  todayKey,
}: {
  schoolClass?: string;
  week: WeekPlan;
  events?: unknown[];
  todayKey?: Weekday;
}) {
  const slots = collectPeriodSlots(week);

  // Pre-compute skipped periods per day (for double-period rowSpan)
  const skippedByDay: Record<Weekday, Set<number>> = {} as Record<Weekday, Set<number>>;
  for (const day of WEEKDAYS) {
    skippedByDay[day] = getSkippedPeriods(week[day]);
  }

  return (
    <div className="overflow-x-auto">
      <table className="wk-grid">
        <thead>
          <tr>
            <th className="wk-corner">Std.</th>
            {WEEKDAYS.map((day) => {
              const isToday = day === todayKey;
              return (
                <th
                  key={day}
                  className={`wk-day-head ${isToday ? 'today' : ''}`}
                  title={DAY_FULL[day]}
                >
                  {DAY_LABELS[day]}
                  {isToday && <span className="wk-today-dot" aria-label="heute" />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.period} className="wk-row">
              <td className="wk-period-cell">
                <span className="wk-period-num">
                  {slot.periodEnd ? `${slot.period}+${slot.periodEnd}` : `${slot.period}`}.
                </span>
                <span className="wk-period-time">{timeStart(slot.time)}</span>
              </td>
              {WEEKDAYS.map((day) => {
                const isToday = day === todayKey;
                const lessons = week[day];

                // Skip this cell if it's covered by a rowSpan from a previous row
                if (skippedByDay[day].has(slot.period)) {
                  return null;
                }

                const lesson = findLesson(lessons, slot);
                const rowSpan = lesson?.periodEnd
                  ? lesson.periodEnd - lesson.period + 1
                  : undefined;

                return (
                  <td
                    key={day}
                    className={`wk-cell ${isToday ? 'wk-cell-today' : ''}`}
                    rowSpan={rowSpan}
                  >
                    {lesson ? (
                      <>
                        <span className="wk-subject">
                          {(lesson.subject ?? '–').split('/').map((part, idx, arr) => (
                            <span key={idx}>
                              {part}
                              {idx < arr.length - 1 && <br />}
                            </span>
                          ))}
                        </span>
                        {lesson.room && (
                          <span className="wk-room">R{lesson.room}</span>
                        )}
                        {lesson.detail && (
                          <span className="wk-detail">{lesson.detail}</span>
                        )}
                      </>
                    ) : (
                      <span className="wk-empty">–</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
