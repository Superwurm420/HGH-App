import { LessonEntry, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';
import { collectPeriodStartTimes } from '@/lib/timetable/lesson-times';
import { formatSubject } from './format-subject';
import styles from './WeekSchedule.module.css';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

type PeriodSlot = { period: number; time: string };

/**
 * Die Stundenzeilen der Woche — je Stunde die eigene Anfangszeit.
 *
 * Die Zeiten kommen aus `collectPeriodStartTimes` über alle Tage hinweg: Eine
 * Stunde, die montags im Block steckt, hat dienstags oft eine echte Einzelzeit.
 */
function collectPeriodSlots(week: WeekPlan): PeriodSlot[] {
  const lessons = WEEKDAYS.flatMap((day) => week[day]);
  const startTimes = collectPeriodStartTimes(lessons);

  const periods = new Set<number>();
  for (const lesson of lessons) {
    const periodEnd = lesson.periodEnd ?? lesson.period;
    for (let period = lesson.period; period <= periodEnd; period += 1) {
      periods.add(period);
    }
  }

  return [...periods]
    .sort((a, b) => a - b)
    .map((period) => ({ period, time: startTimes.get(period) ?? '' }));
}

function findLessonForPeriod(lessons: LessonEntry[], period: number): LessonEntry | null {
  return lessons.find((lesson) => {
    const periodEnd = lesson.periodEnd ?? lesson.period;
    return period >= lesson.period && period <= periodEnd;
  }) ?? null;
}

function hasBreakBeforePeriod(period: number): boolean {
  return period === 3 || period === 5 || period === 7;
}

function isMergedBlockStart(lesson: LessonEntry, period: number): boolean {
  if (period === lesson.period) {
    return true;
  }

  return hasBreakBeforePeriod(period);
}

function mergedRowSpanForPeriod(lesson: LessonEntry, period: number): number {
  const periodEnd = lesson.periodEnd ?? lesson.period;

  let spanEnd = period;
  while (spanEnd < periodEnd && !hasBreakBeforePeriod(spanEnd + 1)) {
    spanEnd += 1;
  }

  return spanEnd - period + 1;
}

export function WeekSchedule({
  week,
  todayKey,
}: {
  week: WeekPlan;
  todayKey?: Weekday;
}) {
  const slots = collectPeriodSlots(week);

  return (
    <>
      <div className={styles.scroll} role="region" tabIndex={0} aria-label="Wochenstundenplan, waagerecht scrollbar">
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.corner}>Std.</th>
              {WEEKDAYS.map((day) => {
                const isToday = day === todayKey;
                return (
                  <th
                    key={day}
                    className={isToday ? `${styles.dayHead} ${styles.dayHeadToday}` : styles.dayHead}
                    title={DAY_FULL[day]}
                  >
                    {DAY_LABELS[day]}
                    {isToday && (
                      <>
                        <span className={styles.todayDot} aria-hidden="true" />
                        <span className="sr-only">, heute</span>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr
                key={slot.period}
                className={hasBreakBeforePeriod(slot.period) ? `${styles.row} ${styles.rowAfterBreak}` : styles.row}
              >
                <td className={styles.periodCell}>
                  <span className={styles.periodNum}>{slot.period}.</span>
                  {slot.time && <span className={styles.periodTime}>{slot.time}</span>}
                </td>
                {WEEKDAYS.map((day) => {
                  const isToday = day === todayKey;
                  const lessons = week[day];
                  const lesson = findLessonForPeriod(lessons, slot.period);

                  if (lesson) {
                    const periodEnd = lesson.periodEnd ?? lesson.period;
                    const shouldMerge = periodEnd > lesson.period;
                    const isBlockStart = isMergedBlockStart(lesson, slot.period);

                    if (shouldMerge && !isBlockStart) {
                      return null;
                    }

                    const rowSpan = shouldMerge ? mergedRowSpanForPeriod(lesson, slot.period) : 1;

                    return (
                      <td
                        key={day}
                        rowSpan={rowSpan}
                        className={isToday ? `${styles.cell} ${styles.cellToday}` : styles.cell}
                      >
                        <div className={styles.cellContent}>
                          <span className={styles.subject}>
                            {formatSubject(lesson.subject ?? '–', styles.subjectPart)}
                          </span>
                          {(lesson.room || lesson.detail) && (
                            <span className={styles.meta}>
                              {lesson.room && <span className={styles.room}>{lesson.room}</span>}
                              {lesson.detail && <span className={styles.detail}>{lesson.detail}</span>}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={day}
                      className={isToday ? `${styles.cell} ${styles.cellToday}` : styles.cell}
                    >
                      <span className={styles.empty}>–</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.scrollHint} aria-hidden="true">Zum Blättern nach links wischen</p>
    </>
  );
}
