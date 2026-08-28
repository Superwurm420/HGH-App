'use client';

import { useState } from 'react';
import { SpecialEvent, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';
import { LessonRow } from './LessonRow';
import { SpecialEventBanner } from './SpecialEventBanner';
import styles from './DayTimetable.module.css';

const DAY_SHORT: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
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
  const lessons = week[activeDay] ?? [];

  return (
    <div>
      <div className={styles.daySelector} role="group" aria-label="Tag auswählen">
        {WEEKDAYS.map((day) => (
          <button
            key={day}
            type="button"
            className={day === todayKey && activeDay !== day ? `${styles.dayButton} ${styles.dayButtonTodayHint}` : styles.dayButton}
            data-active={activeDay === day ? 'true' : 'false'}
            onClick={() => setActiveDay(day)}
          >
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>

      <SpecialEventBanner events={events} day={activeDay} />

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Keine Einträge für {DAY_SHORT[activeDay]}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <div className="tt-header">
            <div className="tt-cell">Stunde</div>
            <div className="tt-cell">Fach</div>
            <div className="tt-cell tt-cell-end">Raum</div>
          </div>
          {lessons.map((lesson) => (
            <LessonRow
              key={`${activeDay}-${lesson.period}-${lesson.time}`}
              lesson={lesson}
              periodLabel={lesson.periodEnd ? `${lesson.period}+${lesson.periodEnd}.` : `${lesson.period}.`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
