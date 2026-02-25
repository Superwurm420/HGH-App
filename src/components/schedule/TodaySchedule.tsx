import { LessonEntry, SpecialEvent, Weekday, dayFromGermanDate } from '@/lib/timetable/types';

export function TodaySchedule({
  day,
  lessons,
  events,
}: {
  day: Weekday;
  lessons: LessonEntry[];
  events: SpecialEvent[];
}) {
  const todaysEvents = events.filter((event) => dayFromGermanDate(event.startsAt) === day);

  return (
    <div>
      {todaysEvents.length > 0 && (
        <div className="announcement-card highlight mb-3">
          <p className="text-sm font-bold mb-1">Sondertermine</p>
          {todaysEvents.map((event) => (
            <p key={event.id} className="text-sm">{event.title} · {event.startsAt}</p>
          ))}
        </div>
      )}

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Kein Unterricht erkannt.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <div className="tt-header">
            <div className="tt-cell">Zeit</div>
            <div className="tt-cell">Fach</div>
            <div className="tt-cell">Raum</div>
            <div className="tt-cell">Info</div>
          </div>
          {lessons.map((lesson) => (
            <div key={`${lesson.period}-${lesson.time}`} className="tt-row">
              <div className="tt-cell text-sm font-medium">
                {lesson.periodEnd ? `${lesson.period}+${lesson.periodEnd}.` : `${lesson.period}.`}
                {' '}{lesson.time}
              </div>
              <div className="tt-cell text-sm">{lesson.subject ?? '-'}</div>
              <div className="tt-cell text-sm font-medium">{lesson.room ?? ''}</div>
              <div className="tt-cell text-xs text-muted">{lesson.detail ?? ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
