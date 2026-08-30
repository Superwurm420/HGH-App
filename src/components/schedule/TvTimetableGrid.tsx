'use client';

import { useMemo } from 'react';
import { LessonEntry, ParsedSchedule, Weekday } from '@/lib/timetable/types';
import { collectPeriodStartTimes, isLessonRunning } from '@/lib/timetable/lesson-times';
import { formatSubject } from './format-subject';
import { useMinutesOfDay } from './use-berlin-minutes';

type TvTimetableGridProps = {
  schedulesByClass: ParsedSchedule;
  day: Weekday;
};

export function TvTimetableGrid({ schedulesByClass, day }: TvTimetableGridProps) {
  // Null am Wochenende: Der Wandbildschirm zeigt dann den Montagsplan, in dem
  // keine Stunde laufen kann.
  const nowMinutes = useMinutesOfDay(day);

  const classes = useMemo(() => Object.keys(schedulesByClass).sort(), [schedulesByClass]);

  const periods = useMemo(() => {
    const periodSet = new Set<number>();

    for (const schoolClass of classes) {
      const entries = schedulesByClass[schoolClass]?.[day] ?? [];
      for (const entry of entries) {
        const end = entry.periodEnd ?? entry.period;
        for (let period = entry.period; period <= end; period += 1) {
          periodSet.add(period);
        }
      }
    }

    return [...periodSet].sort((a, b) => a - b);
  }, [classes, day, schedulesByClass]);

  const lessonByClassAndPeriod = useMemo(() => {
    const map = new Map<string, LessonEntry>();

    for (const schoolClass of classes) {
      const entries = schedulesByClass[schoolClass]?.[day] ?? [];
      for (const entry of entries) {
        const end = entry.periodEnd ?? entry.period;
        for (let period = entry.period; period <= end; period += 1) {
          map.set(`${schoolClass}-${period}`, entry);
        }
      }
    }

    return map;
  }, [classes, day, schedulesByClass]);

  const rowSpanByClassAndPeriod = useMemo(() => {
    const map = new Map<string, number>();

    for (const schoolClass of classes) {
      const entries = schedulesByClass[schoolClass]?.[day] ?? [];

      for (const entry of entries) {
        const start = entry.period;
        const end = entry.periodEnd ?? entry.period;

        map.set(`${schoolClass}-${start}`, Math.max(1, end - start + 1));
        for (let period = start + 1; period <= end; period += 1) {
          map.set(`${schoolClass}-${period}`, 0);
        }
      }
    }

    return map;
  }, [classes, day, schedulesByClass]);

  // Je Stunde die eigene Anfangszeit — ein Block darf nicht allen seinen
  // Stunden seine Startzeit aufdrücken.
  const periodTimeByPeriod = useMemo(
    () => collectPeriodStartTimes(classes.flatMap((schoolClass) => schedulesByClass[schoolClass]?.[day] ?? [])),
    [classes, day, schedulesByClass],
  );

  const currentPeriods = useMemo(() => {
    const allEntries = classes.flatMap((schoolClass) => schedulesByClass[schoolClass]?.[day] ?? []);
    const active = new Set<number>();

    if (nowMinutes === null) return active;

    for (const entry of allEntries) {
      if (!isLessonRunning(entry, nowMinutes)) continue;
      const periodEnd = entry.periodEnd ?? entry.period;
      for (let period = entry.period; period <= periodEnd; period += 1) {
        active.add(period);
      }
    }

    return active;
  }, [classes, day, nowMinutes, schedulesByClass]);

  if (periods.length === 0) {
    return <p className="text-sm text-muted">Für heute wurden keine Unterrichtszeiten gefunden.</p>;
  }

  return (
    <div className="tv-table-wrap" role="region" aria-label="Stundenplan aller Klassen">
      <table className="tv-table">
        <thead>
          <tr>
            <th scope="col">Stunde</th>
            {classes.map((schoolClass) => (
              <th key={schoolClass} scope="col">{schoolClass}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const isCurrent = currentPeriods.has(period);
            const periodTime = periodTimeByPeriod.get(period);

            return (
              <tr key={period} data-current={isCurrent ? 'true' : 'false'}>
                <th scope="row" className="tv-period-cell">
                  <span className="tv-period">{period}.</span>
                  {periodTime && <span className="tv-period-time">{periodTime}</span>}
                </th>
                {classes.map((schoolClass) => {
                  const lesson = lessonByClassAndPeriod.get(`${schoolClass}-${period}`);
                  const rowSpan = rowSpanByClassAndPeriod.get(`${schoolClass}-${period}`) ?? 1;

                  if (rowSpan === 0) {
                    return null;
                  }

                  return (
                    <td
                      key={`${schoolClass}-${period}`}
                      rowSpan={rowSpan}
                      data-double={rowSpan > 1 ? 'true' : 'false'}
                      className={lesson ? 'tv-lesson-cell' : undefined}
                    >
                      {lesson ? (
                        <div className="tv-cell-content">
                          <span className="tv-subject">{lesson.subject ? formatSubject(lesson.subject) : '—'}</span>
                          {lesson.room ? <span className="tv-room">Raum {lesson.room}</span> : null}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
