import { WeekPlan, WEEKDAYS } from '@/lib/timetable/types';

export function WeekSchedule({ schoolClass, week }: { schoolClass: string; week: WeekPlan }) {
  return (
    <section className="space-y-3">
      <div className="card">
        <h2 className="text-lg font-semibold">Wochenübersicht – {schoolClass}</h2>
      </div>
      {WEEKDAYS.map((day) => (
        <article key={day} className="card">
          <h3 className="mb-2 font-semibold">{day}</h3>
          {week[day].length === 0 ? (
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
      ))}
    </section>
  );
}
