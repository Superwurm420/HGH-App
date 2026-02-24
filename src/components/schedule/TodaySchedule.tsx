import { LessonEntry, SpecialEvent, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Montag',
  DI: 'Dienstag',
  MI: 'Mittwoch',
  DO: 'Donnerstag',
  FR: 'Freitag',
};

function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}

export function TodaySchedule({
  schoolClass,
  day,
  lessons,
  events,
}: {
  schoolClass: string;
  day: Weekday;
  lessons: LessonEntry[];
  events: SpecialEvent[];
}) {
  const todaysEvents = events.filter((event) => dayFromGermanDate(event.startsAt) === day);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="day-badge">{DAY_LABELS[day]}</span>
        <span className="text-sm font-semibold">{schoolClass}</span>
      </div>

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
            <div className="tt-cell">Info</div>
          </div>
          {lessons.map((lesson) => (
            <div key={`${lesson.period}-${lesson.time}`} className="tt-row">
              <div className="tt-cell text-sm font-medium">
                {lesson.periodEnd ? `${lesson.period}+${lesson.periodEnd}.` : `${lesson.period}.`}
                {' '}{lesson.time}
              </div>
              <div className="tt-cell text-sm">{lesson.subject ?? '-'}</div>
              <div className="tt-cell text-xs text-muted">{lesson.detail ?? ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
