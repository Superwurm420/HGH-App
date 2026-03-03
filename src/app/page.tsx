import Link from 'next/link';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { TodaySchedule } from '@/components/schedule/TodaySchedule';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { Countdown } from '@/components/ui/Countdown';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncementsByClass } from '@/lib/announcements/server';
import { DailyMessage } from '@/components/ui/DailyMessage';
import { GoogleCalendar } from '@/components/ui/GoogleCalendar';
import { getCalendarUrls } from '@/lib/calendar/server';
import { getMessages } from '@/lib/messages/server';
import { getSchoolHolidays } from '@/lib/holidays/server';

export const dynamic = 'force-dynamic';
const MAX_HOME_ANNOUNCEMENTS = 2;

export default async function HomePage({ searchParams }: { searchParams: { klasse?: string } }) {
  const [plan, calendarUrls, messagesData, schoolHolidays] = await Promise.all([
    getWeeklyPlanForClass(searchParams.klasse),
    getCalendarUrls(),
    getMessages(),
    getSchoolHolidays(),
  ]);

  if (!plan) {
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

  const events = await getSpecialEventsByClass(plan.schoolClass);
  const announcements = await getAnnouncementsByClass(plan.schoolClass);
  const previewAnnouncements = announcements.slice(0, MAX_HOME_ANNOUNCEMENTS);
  const hasMore = announcements.length > MAX_HOME_ANNOUNCEMENTS;

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />

      <div className="home-dashboard">
        <div className="card surface">
          <div className="mb-1">
            <ClassSelector classes={plan.availableClasses} />
          </div>

          <div className="home-landscape-grid">
            <div className="home-landscape-info">
              <Countdown lessons={plan.week[plan.todayKey]} />

              <DailyMessage
                messages={messagesData}
                schoolClass={plan.schoolClass}
                lessons={plan.week[plan.todayKey]}
                schoolHolidays={schoolHolidays}
              />
            </div>

            <div>
              <TodaySchedule
                day={plan.todayKey}
                lessons={plan.week[plan.todayKey]}
                events={events}
              />
            </div>
          </div>

          {plan.updatedAt && (
            <p className="meta-note">Aktualisiert am: {plan.updatedAt}</p>
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
              <AnnouncementList items={previewAnnouncements} />
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
