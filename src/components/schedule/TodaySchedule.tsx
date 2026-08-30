'use client';

import { LessonEntry, SpecialEvent, Weekday } from '@/lib/timetable/types';
import { formatPeriodLabel, isLessonRunning } from '@/lib/timetable/lesson-times';
import { LessonRow } from './LessonRow';
import { SpecialEventBanner } from './SpecialEventBanner';
import { useMinutesOfDay } from './use-berlin-minutes';

export function TodaySchedule({
  day,
  lessons,
  events,
}: {
  day: Weekday;
  lessons: LessonEntry[];
  events: SpecialEvent[];
}) {
  const nowMinutes = useMinutesOfDay(day);

  return (
    <div>
      <SpecialEventBanner events={events} day={day} />

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Kein Unterricht erkannt.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          {lessons.map((lesson) => (
            <LessonRow
              key={`${lesson.period}-${lesson.time}`}
              lesson={lesson}
              periodLabel={formatPeriodLabel(lesson.period, lesson.periodEnd)}
              isCurrent={nowMinutes !== null && isLessonRunning(lesson, nowMinutes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
