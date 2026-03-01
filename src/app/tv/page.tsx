import { getAnnouncements, getSpecialEventsForAllClasses } from '@/lib/announcements/server';
import { getWeeklyPlanForAllClasses } from '@/lib/timetable/server';
import { Clock } from '@/components/ui/Clock';
import { TvTimetableGrid } from '@/components/schedule/TvTimetableGrid';
import { Weekday, eventAppliesToDay } from '@/lib/timetable/types';
import { parseBerlinDate } from '@/lib/announcements/parser';

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MO: 'Montag',
  DI: 'Dienstag',
  MI: 'Mittwoch',
  DO: 'Donnerstag',
  FR: 'Freitag',
};

export default async function TvPage() {
  const plan = await getWeeklyPlanForAllClasses();

  if (!plan) {
    return (
      <div className="card surface">
        <h1 className="section-title">TV-Ansicht</h1>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const [announcements, specialEvents] = await Promise.all([
    getAnnouncements(),
    getSpecialEventsForAllClasses(),
  ]);

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const aDate = parseBerlinDate(a.date)?.getTime() ?? 0;
    const bDate = parseBerlinDate(b.date)?.getTime() ?? 0;
    return bDate - aDate;
  });

  const todaysEvents = specialEvents.filter((event) => eventAppliesToDay(event, plan.todayKey));
  const sortedTodayEvents = [...todaysEvents].sort((a, b) => {
    const aDate = parseBerlinDate(a.startsAt)?.getTime() ?? 0;
    const bDate = parseBerlinDate(b.startsAt)?.getTime() ?? 0;
    return aDate - bDate;
  });

  return (
    <div className="tv-view">
      <header className="tv-header">
        <div className="tv-branding">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/content/branding/school-logo.svg" alt="HGH Logo" width={72} height={72} />
          <div>
            <h1>TV-Ansicht Eingangsbereich</h1>
            <p>Live-Übersicht für Uhrzeit, Pinnwand und Stundenplan</p>
          </div>
        </div>

        <div className="tv-header-right">
          <Clock />
          <p className="text-sm text-muted">Heute: {WEEKDAY_LABEL[plan.todayKey]}</p>
          {plan.updatedAt && <p className="text-sm text-muted">Stand Stundenplan: {plan.updatedAt}</p>}
        </div>
      </header>

      <section className="tv-main-grid" aria-label="TV-Übersicht">
        <article className="tv-panel">
          <h2>Pinnwand</h2>
          {sortedAnnouncements.length === 0 ? (
            <p className="text-sm text-muted">Keine aktiven Pinnwand-Einträge.</p>
          ) : (
            <div className="tv-list">
              {sortedAnnouncements.slice(0, 8).map((item) => (
                <article key={item.file} className="tv-list-item">
                  <div className="tv-list-head">
                    <strong>{item.title ?? 'Ohne Titel'}</strong>
                    {item.date ? <span>{item.date}</span> : null}
                  </div>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="tv-panel">
          <h2>Sondertermine</h2>
          {sortedTodayEvents.length === 0 ? (
            <p className="text-sm text-muted">Keine Sondertermine heute.</p>
          ) : (
            <ul className="tv-events">
              {sortedTodayEvents.slice(0, 8).map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <span>{event.startsAt}{event.endsAt ? ` bis ${event.endsAt}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="tv-panel tv-timetable-panel">
        <div className="tv-panel-heading">
          <h2>Stundenplan (alle Klassen)</h2>
          <a className="btn secondary text-sm" href={plan.latest.href} target="_blank" rel="noreferrer">
            Original-PDF öffnen
          </a>
        </div>
        <TvTimetableGrid schedulesByClass={plan.schedulesByClass} day={plan.todayKey} />
      </section>
    </div>
  );
}
