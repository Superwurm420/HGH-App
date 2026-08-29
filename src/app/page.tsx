import Link from 'next/link';

import { TodaySchedule } from '@/components/schedule/TodaySchedule';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { Countdown } from '@/components/ui/Countdown';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { DailyMessage } from '@/components/ui/DailyMessage';
import { GoogleCalendar } from '@/components/ui/GoogleCalendar';
import {
  announcementsToEvents,
  toDisplayAnnouncement,
  loadAnnouncements,
  loadAppSettings,
  loadSchedulePage,
} from '@/server/page-data';
import { TimetableMeta } from '@/components/schedule/TimetableMeta';

export const dynamic = 'force-dynamic';

const MAX_HOME_ANNOUNCEMENTS = 2;

type PageProps = { searchParams: Promise<{ klasse?: string }> };

export default async function HomePage({ searchParams }: PageProps) {
  const { klasse } = await searchParams;

  const [schedule, settings] = await Promise.all([
    loadSchedulePage(klasse),
    loadAppSettings(),
  ]);

  const calendar = settings.calendarUrls.length > 0
    ? <GoogleCalendar urls={settings.calendarUrls} />
    : <MiniCalendar />;

  if (!schedule.hasTimetable || !schedule.selectedClass) {
    return (
      <>
        <h1 className="sr-only">Startseite</h1>
        <div className="card surface">
          <Countdown lessons={[]} />
          <DailyMessage messages={settings.messages} schoolHolidays={settings.schoolHolidays} />
          <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
        </div>
        <div className="mt-3">{calendar}</div>
      </>
    );
  }

  const { timetable, selectedClass } = schedule;
  const todayLessons = timetable.entries[selectedClass]?.[timetable.todayKey] ?? [];

  const announcements = await loadAnnouncements(selectedClass);
  const preview = announcements.slice(0, MAX_HOME_ANNOUNCEMENTS);
  const hasMore = announcements.length > MAX_HOME_ANNOUNCEMENTS;

  return (
    <>
      <ClassFromStorage classes={timetable.classes} />
      <h1 className="sr-only">Stundenplan {selectedClass} – heute</h1>

      <div className="home-dashboard">
        <div className="card surface">
          {/* Umgestellt wird auf den Reitern Tag und Woche — hier steht nur, was gilt. */}
          <p className="text-sm text-muted mb-1">Klasse {selectedClass}</p>

          <div className="home-landscape-grid">
            <div className="home-landscape-info">
              <Countdown lessons={todayLessons} />

              <DailyMessage
                messages={settings.messages}
                schoolClass={selectedClass}
                lessons={todayLessons}
                schoolHolidays={settings.schoolHolidays}
              />
            </div>

            <div>
              <TodaySchedule
                day={timetable.todayKey}
                lessons={todayLessons}
                events={announcementsToEvents(announcements)}
              />
            </div>
          </div>

          <TimetableMeta upload={timetable.upload} />
        </div>

        <div className="home-secondary-grid">
          {preview.length > 0 && (
            <div className="card surface home-secondary-card">
              <div className="section-header">
                <h2 className="section-title">Ankündigungen</h2>
                {hasMore && (
                  <Link href="/pinnwand" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                    Alle anzeigen
                  </Link>
                )}
              </div>
              <AnnouncementList items={preview.map(toDisplayAnnouncement)} />
            </div>
          )}

          <div className="home-secondary-card">{calendar}</div>
        </div>
      </div>
    </>
  );
}
