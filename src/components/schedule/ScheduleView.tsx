import { SpecialEvent, TimetableMeta } from '@/lib/timetable/types';

export function ScheduleView({ schoolClass, latest, events }: { schoolClass: string; latest: TimetableMeta | null; events: SpecialEvent[] }) {
  return (
    <section className="space-y-4">
      <div className="card">
        <h2 className="mb-2 text-lg font-semibold">Stundenplan für {schoolClass}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sondertermine werden priorisiert angezeigt und überschreiben regulären Unterricht.
        </p>
        {latest ? (
          <a className="btn-primary mt-3" href={latest.href} target="_blank" rel="noreferrer">
            Original-PDF anzeigen
          </a>
        ) : (
          <p className="mt-3 text-sm text-rose-600">Keine gültige Stundenplan-PDF gefunden.</p>
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 text-base font-semibold">Sondertermine (Priorität)</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Keine Sondertermine gefunden. Es gilt der reguläre Unterricht laut PDF.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm">Start: {event.startsAt}</p>
                {event.endsAt ? <p className="text-sm">Ende: {event.endsAt}</p> : null}
                {event.audience ? <p className="text-sm">Betroffen: {event.audience}</p> : null}
                {event.details ? <p className="mt-1 text-sm">{event.details}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
