'use client';

import { useState } from 'react';
import { LessonEntry, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

/** Extract readable time from "8.00 - 9.30" → "8:00 – 9:30" */
function formatTime(time: string): string {
  return time.replace(/\./g, ':').replace(/\s*-\s*/, ' – ');
}

/** Format period label: "1+2" for double periods, "3" for single */
function periodLabel(lesson: LessonEntry): string {
  if (lesson.periodEnd) return `${lesson.period}–${lesson.periodEnd}`;
  return `${lesson.period}`;
}

function formatSubject(subject: string) {
  return subject.split('/').map((part, i, arr) => (
    <span key={i}>
      {part}{i < arr.length - 1 && <>{'/\u200B'}</>}
    </span>
  ));
}

function DayCard({
  day,
  lessons,
  isToday,
  defaultOpen,
}: {
  day: Weekday;
  lessons: LessonEntry[];
  isToday: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`wk-day-card ${isToday ? 'wk-day-today' : ''}`}>
      <button
        type="button"
        className={`wk-day-toggle ${isToday ? 'today' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="wk-day-name">
          {DAY_FULL[day]}
          {isToday && <span className="wk-badge-today">Heute</span>}
        </span>
        <span className="wk-day-count">
          {lessons.length === 0 ? 'Frei' : `${lessons.length} ${lessons.length === 1 ? 'Fach' : 'Fächer'}`}
        </span>
        <span className={`wk-chevron ${open ? 'open' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>

      {open && (
        <div className="wk-day-lessons">
          {lessons.length === 0 ? (
            <p className="wk-free-text">Kein Unterricht</p>
          ) : (
            lessons.map((lesson) => (
              <div key={`${lesson.period}-${lesson.time}`} className="wk-lesson-row">
                <div className="wk-lesson-period">
                  <span className="wk-lesson-pnum">{periodLabel(lesson)}</span>
                  <span className="wk-lesson-time">{formatTime(lesson.time)}</span>
                </div>
                <div className="wk-lesson-body">
                  <span className="wk-lesson-subject">
                    {lesson.subject ? formatSubject(lesson.subject) : '–'}
                  </span>
                  {(lesson.room || lesson.detail) && (
                    <span className="wk-lesson-meta">
                      {lesson.room && <span className="wk-lesson-room">Raum {lesson.room}</span>}
                      {lesson.detail && <span className="wk-lesson-detail">{lesson.detail}</span>}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
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
  return (
    <div className="wk-container">
      {/* Mobile: Card layout (default) */}
      <div className="wk-cards">
        {WEEKDAYS.map((day) => (
          <DayCard
            key={day}
            day={day}
            lessons={week[day] ?? []}
            isToday={day === todayKey}
            defaultOpen={day === todayKey || !todayKey}
          />
        ))}
      </div>

      {/* Desktop: Clean table layout */}
      <div className="wk-table-wrap">
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
            {collectPeriodSlots(week).map((slot) => {
              const skippedByDay = computeSkippedByDay(week);
              return (
                <tr key={slot.period} className="wk-row">
                  <td className="wk-period-cell">
                    <span className="wk-period-num">
                      {slot.periodEnd ? `${slot.period}–${slot.periodEnd}` : `${slot.period}`}
                    </span>
                    <span className="wk-period-time">{formatTime(slot.time)}</span>
                  </td>
                  {WEEKDAYS.map((day) => {
                    const isToday = day === todayKey;
                    const lessons = week[day];

                    if (skippedByDay[day].has(slot.period)) {
                      return null;
                    }

                    const lesson = lessons.find((l) => l.period === slot.period);
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Helpers for the desktop table ─────────────────────────────── */

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
