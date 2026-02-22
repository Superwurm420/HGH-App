import { LessonEntry, SpecialEvent, Weekday } from '@/lib/timetable/types';

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
    <section className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Unterricht heute ({day}) – {schoolClass}</h2>

        {todaysEvents.length > 0 ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/20">
            <p className="font-semibold">Sondertermine haben heute Vorrang</p>
            <ul className="mt-2 space-y-1">
              {todaysEvents.map((event) => (
                <li key={event.id}>{event.title} · {event.startsAt}</li>
              ))}
            </ul>
          </div>
        ) : lessons.length === 0 ? (
          <p className="mt-2 text-sm">Heute wurden keine regulären Unterrichtsblöcke erkannt.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lessons.map((lesson) => (
              <li key={`${lesson.period}-${lesson.time}`} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                <p className="text-sm font-medium">{lesson.period}. Std · {lesson.time}</p>
                <p className="text-sm">{lesson.subject}</p>
                {lesson.detail ? <p className="text-xs text-slate-500">{lesson.detail}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="text-base font-semibold">Ankündigungen / Sondertermine</h3>
        {events.length === 0 ? <p className="mt-2 text-sm">Keine Sondertermine für deine Klasse.</p> : (
          <ul className="mt-2 space-y-2">
            {events.map((event) => <li key={event.id} className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm dark:border-amber-700 dark:bg-amber-900/20">{event.title} · {event.startsAt}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
