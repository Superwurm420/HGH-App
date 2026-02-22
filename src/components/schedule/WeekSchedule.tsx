import { SpecialEvent, WeekPlan, WEEKDAYS, Weekday } from '@/lib/timetable/types';

function dayFromGermanDate(value: string): Weekday | null {
  const [datePart] = value.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = { 0: null, 1: 'MO', 2: 'DI', 3: 'MI', 4: 'DO', 5: 'FR', 6: null };
  return map[jsDay] ?? null;
}

export function WeekSchedule({ schoolClass, week, events }: { schoolClass: string; week: WeekPlan; events: SpecialEvent[] }) {
  return (
    <section className="space-y-3">
      <div className="card">
        <h2 className="text-lg font-semibold">Wochenübersicht – {schoolClass}</h2>
      </div>
      {WEEKDAYS.map((day) => {
        const dayEvents = events.filter((event) => dayFromGermanDate(event.startsAt) === day);
        return (
          <article key={day} className="card">
            <h3 className="mb-2 font-semibold">{day}</h3>
            {dayEvents.length > 0 ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/20">
                <p className="font-semibold">Sondertermine (priorisiert)</p>
                <ul className="mt-1 space-y-1">
                  {dayEvents.map((event) => (
                    <li key={event.id}>{event.title} · {event.startsAt}</li>
                  ))}
                </ul>
              </div>
            ) : week[day].length === 0 ? (
              <p className="text-sm">Keine Einträge erkannt.</p>
            ) : (
              <ul className="space-y-2">
                {week[day].map((lesson) => (
                  <li key={`${day}-${lesson.period}-${lesson.time}`} className="text-sm">
                    <strong>{lesson.period}. Std ({lesson.time})</strong>: {lesson.subject}
                    {lesson.detail ? <span className="text-xs text-slate-500"> · {lesson.detail}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
