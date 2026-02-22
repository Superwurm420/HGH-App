import { LessonEntry, SpecialEvent, Weekday } from '@/lib/timetable/types';

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
  return (
    <section className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Unterricht heute ({day}) – {schoolClass}</h2>
        {lessons.length === 0 ? (
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
        <h3 className="text-base font-semibold">Ankündigungen / Sondertermine (haben Vorrang)</h3>
        {events.length === 0 ? <p className="mt-2 text-sm">Keine Sondertermine für deine Klasse.</p> : (
          <ul className="mt-2 space-y-2">
            {events.map((event) => <li key={event.id} className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm dark:border-amber-700 dark:bg-amber-900/20">{event.title} · {event.startsAt}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
