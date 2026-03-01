'use client';

import { useEffect, useMemo, useState } from 'react';
import { LessonEntry, ParsedSchedule, Weekday } from '@/lib/timetable/types';

type TvTimetableGridProps = {
  schedulesByClass: ParsedSchedule;
  day: Weekday;
};

type LessonRange = {
  startMinutes: number;
  endMinutes: number;
};

function parseTimeRange(time: string): LessonRange | null {
  const normalized = time.replace(/\s+/g, ' ');
  const parts = normalized.split('-').map((part) => part.trim());
  if (parts.length !== 2) return null;

  const start = parts[0].replace('.', ':');
  const end = parts[1].replace('.', ':');

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    startMinutes: startHour * 60 + startMinute,
    endMinutes: endHour * 60 + endMinute,
  };
}

function getBerlinMinutesNow(): number {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return hour * 60 + minute;
}

function findCurrentPeriod(entries: LessonEntry[], nowMinutes: number): number | null {
  for (const entry of entries) {
    const range = parseTimeRange(entry.time);
    if (!range) continue;
    if (nowMinutes >= range.startMinutes && nowMinutes < range.endMinutes) {
      return entry.period;
    }
  }
  return null;
}

function formatLesson(entry: LessonEntry): string {
  const subject = entry.subject ?? '—';
  const room = entry.room ? ` · R${entry.room}` : '';
  const detail = entry.detail ? ` · ${entry.detail}` : '';
  return `${subject}${room}${detail}`;
}

export function TvTimetableGrid({ schedulesByClass, day }: TvTimetableGridProps) {
  const [nowMinutes, setNowMinutes] = useState<number>(() => getBerlinMinutesNow());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMinutes(getBerlinMinutesNow());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

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

  const currentPeriods = useMemo(() => {
    const allEntries = classes.flatMap((schoolClass) => schedulesByClass[schoolClass]?.[day] ?? []);
    const active = new Set<number>();

    for (const entry of allEntries) {
      const current = findCurrentPeriod([entry], nowMinutes);
      if (!current) continue;
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

            return (
              <tr key={period} data-current={isCurrent ? 'true' : 'false'}>
                <th scope="row">{period}.</th>
                {classes.map((schoolClass) => {
                  const lesson = lessonByClassAndPeriod.get(`${schoolClass}-${period}`);
                  const isContinuation = lesson && (lesson.periodEnd ?? lesson.period) > lesson.period && period > lesson.period;

                  return (
                    <td key={`${schoolClass}-${period}`}>
                      {lesson ? (
                        <>
                          {isContinuation ? <span className="tv-continued">↳</span> : null}
                          {formatLesson(lesson)}
                          <div className="tv-time">{lesson.time}</div>
                        </>
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
