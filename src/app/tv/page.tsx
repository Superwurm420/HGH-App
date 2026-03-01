import { getAnnouncements } from '@/lib/announcements/server';
import { getWeeklyPlanForAllClasses } from '@/lib/timetable/server';
import { Clock } from '@/components/ui/Clock';
import { TvTimetableGrid } from '@/components/schedule/TvTimetableGrid';
import { parseBerlinDate } from '@/lib/announcements/parser';
import { TvPageController } from '@/components/tv/TvPageController';

export const dynamic = 'force-dynamic';
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

  const announcements = await getAnnouncements();

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const aDate = parseBerlinDate(a.date)?.getTime() ?? 0;
    const bDate = parseBerlinDate(b.date)?.getTime() ?? 0;
    return bDate - aDate;
  });

  return (
    <div className="tv-view">
      <TvPageController />
      <section className="tv-main-grid" aria-label="TV-Übersicht">
        <article className="tv-panel tv-clock-panel">
          <div className="tv-headline">
            <h1>HGH Holztechnik und Gestaltung</h1>
          </div>

          <div className="tv-branding-row">
            <div className="tv-branding">
              <div className="tv-logo-wrap" aria-hidden="true">
                <img src="/content/branding/school-logo.svg" alt="" className="tv-logo" />
              </div>
            </div>

            <Clock variant="tv" />
          </div>

          {plan.updatedAt && <p className="text-sm text-muted">Stand Stundenplan: {plan.updatedAt}</p>}
        </article>

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

      </section>

      <section className="tv-panel tv-timetable-panel">
        <TvTimetableGrid schedulesByClass={plan.schedulesByClass} day={plan.todayKey} />
      </section>
    </div>
  );
}
