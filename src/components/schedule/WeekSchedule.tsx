import { SpecialEvent, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

const DAY_LABELS: Record<Weekday, string> = {
  MO: 'Montag', DI: 'Dienstag', MI: 'Mittwoch', DO: 'Donnerstag', FR: 'Freitag',
};

function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}

export function WeekSchedule({
  week,
  events,
  todayKey,
}: {
  schoolClass?: string;
  week: WeekPlan;
  events: SpecialEvent[];
  todayKey?: Weekday;
}) {
  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day) => {
        const dayEvents = events.filter((event) => dayFromGermanDate(event.startsAt) === day);
        const lessons = week[day];
        const isToday = day === todayKey;

        return (
          <div key={day}>
            <div className={`week-day-header ${isToday ? 'today' : ''}`}>
              {DAY_LABELS[day]} {isToday && '(heute)'}
            </div>

            {dayEvents.length > 0 && (
              <div className="announcement-card highlight mt-1 mb-1">
                {dayEvents.map((event) => (
                  <p key={event.id} className="text-sm">{event.title} · {event.startsAt}</p>
                ))}
              </div>
            )}

            {lessons.length === 0 ? (
              <p className="text-sm text-muted py-2 px-3">Keine Einträge.</p>
            ) : (
              <div className="overflow-hidden rounded-b-xl border border-t-0 border-[var(--line)]">
                {lessons.map((lesson) => (
                  <div key={`${day}-${lesson.period}-${lesson.time}`} className="tt-row">
                    <div className="tt-cell text-sm font-medium">{lesson.period}. {lesson.time}</div>
                    <div className="tt-cell text-sm">{lesson.subject ?? '-'}</div>
                    <div className="tt-cell text-xs text-muted">{lesson.detail ?? ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
