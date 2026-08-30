import Link from 'next/link';

import { Clock } from '@/components/ui/Clock';
import { TimetableMeta } from '@/components/schedule/TimetableMeta';
import { TvSchedulePanel } from '@/components/schedule/TvSchedulePanel';
import { TvPageController } from '@/components/tv/TvPageController';
import { TvSlideshow } from '@/components/tv/TvSlideshow';
import { mediaUrl } from '@/lib/api/client';
import { loadAnnouncements, loadSchedulePage, loadTvImages } from '@/server/page-data';

export const dynamic = 'force-dynamic';

const MAX_TV_ANNOUNCEMENTS = 8;

export default async function TvPage() {
  const [schedule, announcements, images] = await Promise.all([
    loadSchedulePage(),
    loadAnnouncements(),
    loadTvImages(),
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
          <div className="tv-branding-row">
            {/* Der Wandbildschirm blendet die Navigation aus — das Logo ist
                deshalb der einzige Weg zurück zur normalen App. */}
            <Link href="/" className="tv-branding" aria-label="Zur Startseite">
              <span className="tv-logo-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/content/branding/school-logo.svg" alt="" className="tv-logo" />
              </span>
            </Link>

            <Clock />
          </div>

          <TimetableMeta
            upload={timetable.upload}
            label="Stand Stundenplan"
            className="text-sm text-muted"
          />
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

        {/* Ohne Überschrift: Der Platz gehört den Bildern. */}
        {slides.length > 0 && (
          <article className="tv-panel tv-slideshow-panel" aria-label="Aus der Schule">
            <TvSlideshow images={slides} />
          </article>
        )}
      </section>

      <section className="tv-panel tv-timetable-panel">
        <TvSchedulePanel schedulesByClass={timetable.entries} day={timetable.todayKey} />
      </section>
    </div>
  );
}
