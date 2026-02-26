import { LessonEntry, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

/** "8.00 - 9.30" → "8:00" */
function timeStart(time: string): string {
  return time.split('-')[0].trim().replace('.', ':');
}

function formatSubject(subject: string) {
  return subject.split('/').map((part, i, arr) => (
    <span key={i}>
      {part}{i < arr.length - 1 && <>{'/\u200B'}</>}
    </span>
  ));
}

type PeriodSlot = { period: number; periodEnd?: number; time: string };

function collectPeriodSlots(week: WeekPlan): PeriodSlot[] {
  const seen = new Map<number, PeriodSlot>();
  for (const day of WEEKDAYS) {
    for (const lesson of week[day]) {
      if (!seen.has(lesson.period)) {
        seen.set(lesson.period, {
          period: lesson.period,
          periodEnd: lesson.periodEnd,
          time: lesson.time,
        });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.period - b.period);
}

function computeSkippedByDay(week: WeekPlan): Record<Weekday, Set<number>> {
  const result = {} as Record<Weekday, Set<number>>;
  for (const day of WEEKDAYS) {
    const skipped = new Set<number>();
    for (const l of week[day]) {
      if (l.periodEnd) {
        for (let p = l.period + 1; p <= l.periodEnd; p++) {
          skipped.add(p);
        }
      }
    }
    result[day] = skipped;
  }
  return result;
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
  const skippedByDay = computeSkippedByDay(week);

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
                  {slot.periodEnd ? `${slot.period}–${slot.periodEnd}` : slot.period}
                </span>
                <span className="wk-period-time">{timeStart(slot.time)}</span>
              </td>
              {WEEKDAYS.map((day) => {
                const isToday = day === todayKey;
                const lessons = week[day];

                if (skippedByDay[day].has(slot.period)) {
                  return null;
                }

                const lesson = lessons.find((l: LessonEntry) => l.period === slot.period);
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
                          {formatSubject(lesson.subject ?? '–')}
                        </span>
                        {lesson.room && (
                          <span className="wk-room">{lesson.room}</span>
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
