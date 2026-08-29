import { Clock } from '@/components/ui/Clock';
import { TvTimetableGrid } from '@/components/schedule/TvTimetableGrid';
import { TvPageController } from '@/components/tv/TvPageController';
import { TvSlideshow } from '@/components/tv/TvSlideshow';
import { mediaUrl } from '@/lib/api/client';
import { loadAnnouncements, loadAppSettings, loadSchedulePage, loadTvImages } from '@/server/page-data';
import { formatBerlinDay } from '@/lib/berlin-time';

export const dynamic = 'force-dynamic';

const MAX_TV_ANNOUNCEMENTS = 8;

export default async function TvPage() {
  const [schedule, announcements, images, settings] = await Promise.all([
    loadSchedulePage(),
    loadAnnouncements(),
    loadTvImages(),
    loadAppSettings(),
  ]);

  if (!schedule.hasTimetable) {
    return (
      <div className="card surface">
        <h1 className="section-title">TV-Ansicht</h1>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const { timetable } = schedule;
  const slides = images.map((image) => ({
    id: image.id,
    filename: image.filename,
    url: mediaUrl(image.id),
  }));

  return (
    <div className="tv-view">
      <TvPageController />
      <section className="tv-main-grid" data-panels={slides.length > 0 ? '3' : '2'} aria-label="TV-Übersicht">
        <article className="tv-panel tv-clock-panel">
          <div className="tv-headline">
            <h1>{settings.schoolName}</h1>
          </div>

          <div className="tv-branding-row">
            <div className="tv-branding">
              <div className="tv-logo-wrap" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/content/branding/school-logo.svg" alt="" className="tv-logo" />
              </div>
            </div>

            <Clock />
          </div>

          {timetable.upload?.updated_at && (
            <p className="text-sm text-muted">
              Stand Stundenplan: {formatBerlinDay(timetable.upload.updated_at)}
            </p>
          )}
        </article>

        <article className="tv-panel">
          <h2>Pinnwand</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted">Keine aktiven Pinnwand-Einträge.</p>
          ) : (
            <div className="tv-list">
              {announcements.slice(0, MAX_TV_ANNOUNCEMENTS).map((item) => (
                <article key={item.id} className="tv-list-item">
                  <div className="tv-list-head">
                    <strong>{item.title}</strong>
                    {item.date ? <span>{item.date}</span> : null}
                  </div>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        {slides.length > 0 && (
          <article className="tv-panel tv-slideshow-panel">
            <h2>Aus der Schule</h2>
            <TvSlideshow images={slides} />
          </article>
        )}
      </section>

      <section className="tv-panel tv-timetable-panel">
        <TvTimetableGrid schedulesByClass={timetable.entries} day={timetable.todayKey} />
      </section>
    </div>
  );
}
