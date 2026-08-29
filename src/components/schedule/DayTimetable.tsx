'use client';

import { useState } from 'react';
import { SpecialEvent, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';
import { isLessonRunning } from '@/lib/timetable/lesson-times';
import { LessonRow } from './LessonRow';
import { SpecialEventBanner } from './SpecialEventBanner';
import { useMinutesOfDay } from './use-berlin-minutes';
import styles from './DayTimetable.module.css';

const DAY_SHORT: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

const DAY_FULL: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

export function DayTimetable({
  week,
  todayKey,
  events,
}: {
  week: WeekPlan;
  todayKey: Weekday;
  events: SpecialEvent[];
}) {
  const [activeDay, setActiveDay] = useState<Weekday>(todayKey);
  // Gibt nur an dem Wochentag eine Uhrzeit zurück, der gerade auch der
  // heutige ist — an einem anderen Tag wird nichts markiert.
  const currentMinutes = useMinutesOfDay(activeDay);
  const lessons = week[activeDay] ?? [];

  return (
    <div>
      <div className={styles.daySelector} role="group" aria-label="Tag auswählen">
        {WEEKDAYS.map((day) => {
          const isActive = activeDay === day;
          const isToday = day === todayKey;
          return (
            <button
              key={day}
              type="button"
              className={isToday && !isActive ? `${styles.dayButton} ${styles.dayButtonTodayHint}` : styles.dayButton}
              data-active={isActive ? 'true' : 'false'}
              aria-pressed={isActive}
              onClick={() => setActiveDay(day)}
            >
              <span aria-hidden="true">{DAY_SHORT[day]}</span>
              <span className="sr-only">{isToday ? `${DAY_FULL[day]} (heute)` : DAY_FULL[day]}</span>
            </button>
          );
        })}
      </div>

      <SpecialEventBanner events={events} day={activeDay} />

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Keine Einträge für {DAY_FULL[activeDay]}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <div className="tt-header">
            <div className="tt-cell">Stunde</div>
            <div className="tt-cell">Fach</div>
            <div className="tt-cell tt-cell-center">Raum</div>
          </div>
          {lessons.map((lesson) => (
            <LessonRow
              key={`${activeDay}-${lesson.period}-${lesson.time}`}
              lesson={lesson}
              periodLabel={lesson.periodEnd ? `${lesson.period}+${lesson.periodEnd}.` : `${lesson.period}.`}
              isCurrent={currentMinutes !== null && isLessonRunning(lesson, currentMinutes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
