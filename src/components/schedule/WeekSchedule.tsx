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

type PeriodSlot = { period: number; time: string };

function collectPeriodSlots(week: WeekPlan): PeriodSlot[] {
  const seen = new Map<number, string>();

  for (const day of WEEKDAYS) {
    for (const lesson of week[day]) {
      const periodEnd = lesson.periodEnd ?? lesson.period;
      for (let period = lesson.period; period <= periodEnd; period += 1) {
        if (!seen.has(period)) {
          seen.set(period, lesson.time);
        }
      }
    }
  }

  return Array.from(seen.entries())
    .map(([period, time]) => ({ period, time }))
    .sort((a, b) => a.period - b.period);
}

function findLessonForPeriod(lessons: LessonEntry[], period: number): LessonEntry | null {
  return lessons.find((lesson) => {
    const periodEnd = lesson.periodEnd ?? lesson.period;
    return period >= lesson.period && period <= periodEnd;
  }) ?? null;
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

  return (
    <div className="wk-scroll" role="region" aria-label="Wochenstundenplan mit horizontalem Scrollen">
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
                <span className="wk-period-num">{slot.period}</span>
                <span className="wk-period-time">{timeStart(slot.time)}</span>
              </td>
              {WEEKDAYS.map((day) => {
                const isToday = day === todayKey;
                const lessons = week[day];
                const lesson = findLessonForPeriod(lessons, slot.period);

                return (
                  <td
                    key={day}
                    className={`wk-cell ${isToday ? 'wk-cell-today' : ''}`}
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
