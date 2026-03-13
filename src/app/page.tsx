import Link from 'next/link';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { TodaySchedule } from '@/components/schedule/TodaySchedule';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { Countdown } from '@/components/ui/Countdown';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { DailyMessage } from '@/components/ui/DailyMessage';
import { GoogleCalendar } from '@/components/ui/GoogleCalendar';
import { fetchTimetable, fetchAnnouncements, fetchSettings, toDisplayAnnouncement, type AnnouncementData } from '@/lib/api/client';
import { Weekday } from '@/lib/timetable/types';
import type { SchoolHolidayRange } from '@/lib/calendar/lowerSaxonySchoolFreeDays';

export const dynamic = 'force-dynamic';
const MAX_HOME_ANNOUNCEMENTS = 2;

export default async function HomePage({ searchParams }: { searchParams: { klasse?: string } }) {
  let plan: Awaited<ReturnType<typeof fetchTimetable>> | null = null;
  let announcements: AnnouncementData[] = [];
  let calendarUrls: string[] = [];
  let messagesData: Record<string, unknown> = {};
  let schoolHolidays: SchoolHolidayRange[] = [];

  try {
    const [timetableRes, settingsRes] = await Promise.all([
      fetchTimetable(searchParams.klasse),
      fetchSettings(),
    ]);
    plan = timetableRes;

    try {
      calendarUrls = JSON.parse(settingsRes.settings.calendar_urls || '[]');
    } catch { /* ignore */ }
    try {
      messagesData = JSON.parse(settingsRes.settings.messages || '{}');
    } catch { /* ignore */ }
    try {
      const parsed = JSON.parse(settingsRes.settings.school_holidays || '[]');
      schoolHolidays = Array.isArray(parsed) ? parsed : parsed?.ranges ?? [];
    } catch { /* ignore */ }
  } catch (error) {
    console.warn('[home] Fehler beim Laden:', error);
  }

  if (!plan || !plan.upload || plan.classes.length === 0) {
    return (
      <>
        <div className="card surface">
          <Countdown lessons={[]} />
          <DailyMessage messages={messagesData} schoolHolidays={schoolHolidays} />
          <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
        </div>
        {calendarUrls.length > 0 ? (
          <GoogleCalendar urls={calendarUrls} />
        ) : (
          <div className="mt-3">
            <MiniCalendar />
          </div>
        )}
      </>
    );
  }

  const selectedClass = searchParams.klasse && plan.entries[searchParams.klasse]
    ? searchParams.klasse
    : plan.classes[0];

  const weekPlan = plan.entries[selectedClass];
  const todayKey = plan.todayKey as Weekday;
  const todayLessons = weekPlan?.[todayKey] ?? [];

  try {
    const announcementRes = await fetchAnnouncements(selectedClass);
    announcements = announcementRes.announcements;
  } catch { /* ignore */ }

  const previewAnnouncements = announcements.slice(0, MAX_HOME_ANNOUNCEMENTS);
  const hasMore = announcements.length > MAX_HOME_ANNOUNCEMENTS;

  // Highlighted announcements as events
  const events = announcements
    .filter((a) => a.highlight === 1)
    .map((a) => ({
      id: a.id,
      title: a.title,
      audience: a.audience,
      startsAt: a.date,
      endsAt: a.expires ?? undefined,
      details: a.body,
      classes: a.classes ? a.classes.split(',').map((c) => c.trim()) : ('alle' as const),
    }));

  return (
    <>
      <ClassFromStorage classes={plan.classes} />

      <div className="home-dashboard">
        <div className="card surface">
          <div className="mb-1">
            <ClassSelector classes={plan.classes} />
          </div>

          <div className="home-landscape-grid">
            <div className="home-landscape-info">
              <Countdown lessons={todayLessons} />

              <DailyMessage
                messages={messagesData}
                schoolClass={selectedClass}
                lessons={todayLessons}
                schoolHolidays={schoolHolidays}
              />
            </div>

            <div>
              <TodaySchedule
                day={todayKey}
                lessons={todayLessons}
                events={events}
              />
            </div>
          </div>

          {plan.upload?.updated_at && (
            <p className="meta-note">
              Aktualisiert: {new Date(plan.upload.updated_at).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>

        <div className="home-secondary-grid">
          {previewAnnouncements.length > 0 && (
            <div className="card surface home-secondary-card">
              <div className="section-header">
                <h2 className="section-title">Ankündigungen</h2>
                {hasMore && (
                  <Link href="/pinnwand" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                    Alle anzeigen
                  </Link>
                )}
              </div>
              <AnnouncementList items={previewAnnouncements.map(toDisplayAnnouncement)} />
            </div>
          )}

          {calendarUrls.length > 0 ? (
            <div className="home-secondary-card">
              <GoogleCalendar urls={calendarUrls} />
            </div>
          ) : (
            <div className="home-secondary-card">
              <MiniCalendar />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
