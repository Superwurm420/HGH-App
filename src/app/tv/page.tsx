import { Clock } from '@/components/ui/Clock';
import { TvTimetableGrid } from '@/components/schedule/TvTimetableGrid';
import { TvPageController } from '@/components/tv/TvPageController';
import { fetchTimetable, fetchAnnouncements, type AnnouncementData } from '@/lib/api/client';
import { Weekday, type ParsedSchedule } from '@/lib/timetable/types';

export const dynamic = 'force-dynamic';
export default async function TvPage() {
  let allEntries: ParsedSchedule = {};
  let todayKey = 'MO';
  let updatedAt: string | null = null;
  let announcements: AnnouncementData[] = [];

  try {
    const plan = await fetchTimetable();
    allEntries = plan.entries;
    todayKey = plan.todayKey;
    updatedAt = plan.upload?.updated_at ?? null;
  } catch {
    /* ignore */
  }

  if (Object.keys(allEntries).length === 0) {
    return (
      <div className="card surface">
        <h1 className="section-title">TV-Ansicht</h1>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  try {
    const res = await fetchAnnouncements();
    announcements = res.announcements;
  } catch {
    /* ignore */
  }

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
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

          {updatedAt && <p className="text-sm text-muted">Stand Stundenplan: {new Date(updatedAt).toLocaleDateString('de-DE')}</p>}
        </article>

        <article className="tv-panel">
          <h2>Pinnwand</h2>
          {sortedAnnouncements.length === 0 ? (
            <p className="text-sm text-muted">Keine aktiven Pinnwand-Einträge.</p>
          ) : (
            <div className="tv-list">
              {sortedAnnouncements.slice(0, 8).map((item) => (
                <article key={item.id} className="tv-list-item">
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
        <TvTimetableGrid schedulesByClass={allEntries} day={todayKey as Weekday} />
      </section>
    </div>
  );
}
