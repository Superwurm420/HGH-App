'use client';

import { useState } from 'react';
import { LessonEntry, SpecialEvent, WeekPlan, WEEKDAYS, Weekday, dayFromGermanDate } from '@/lib/timetable/types';

const DAY_SHORT: Record<Weekday, string> = {
  MO: 'Mo', DI: 'Di', MI: 'Mi', DO: 'Do', FR: 'Fr',
};

function formatSubject(subject: string) {
  return subject.split('/').map((part, i, arr) => (
    <span key={i}>
      {part}{i < arr.length - 1 && <>{'/\u200B'}</>}
    </span>
  ));
}

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
  const dayEvents = events.filter((e) => dayFromGermanDate(e.startsAt) === activeDay);

  return (
    <div>
      <div className="flex gap-2 mb-4" role="group" aria-label="Tag auswählen">
        {WEEKDAYS.map((day) => (
          <button
            key={day}
            type="button"
            className={`day-btn ${day === todayKey && activeDay !== day ? 'today-hint' : ''}`}
            data-active={activeDay === day ? 'true' : 'false'}
            onClick={() => setActiveDay(day)}
          >
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>

      {dayEvents.length > 0 && (
        <div className="announcement-card highlight mb-3">
          <p className="text-sm font-bold mb-1">Sondertermine</p>
          {dayEvents.map((event) => (
            <p key={event.id} className="text-sm">{event.title} · {event.startsAt}</p>
          ))}
        </div>
      )}

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Keine Einträge für {DAY_SHORT[activeDay]}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <div className="tt-header">
            <div className="tt-cell">Stunde</div>
            <div className="tt-cell">Fach</div>
            <div className="tt-cell tt-cell-end">Raum</div>
          </div>
          {lessons.map((lesson: LessonEntry) => (
            <div key={`${activeDay}-${lesson.period}-${lesson.time}`} className="tt-row">
              <div className="tt-cell tt-period-cell">
                <span className="tt-period-num">
                  {lesson.periodEnd ? `${lesson.period}+${lesson.periodEnd}.` : `${lesson.period}.`}
                </span>
                <span className="tt-period-time">{lesson.time}</span>
              </div>
              <div className="tt-cell tt-subject-cell">
                {lesson.subject ? formatSubject(lesson.subject) : '-'}
              </div>
              <div className="tt-cell tt-info-cell">
                {lesson.room && <span className="tt-room">{lesson.room}</span>}
                {lesson.detail && <span className="tt-detail">{lesson.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
