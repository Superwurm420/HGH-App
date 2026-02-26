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
import messagesData from '@/generated/messages-data.json';
import calendarData from '@/generated/calendar-data.json';

const MAX_HOME_ANNOUNCEMENTS = 2;

export default async function HomePage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);
  const calendarUrls = (calendarData as { urls: string[] }).urls ?? [];

  if (!plan) {
    return (
      <>
        <div className="card surface">
          <Countdown />
          <DailyMessage messages={messagesData as Record<string, unknown>} />
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

      <div className="card surface">
        <div className="mb-1">
          <ClassSelector classes={plan.availableClasses} />
        </div>

        <Countdown />

        <DailyMessage
          messages={messagesData as Record<string, unknown>}
          schoolClass={plan.schoolClass}
        />

        <TodaySchedule
          day={plan.todayKey}
          lessons={plan.week[plan.todayKey]}
          events={events}
        />
      </div>

      {previewAnnouncements.length > 0 && (
        <div className="card surface mt-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Ankündigungen</h2>
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
        <GoogleCalendar urls={calendarUrls} />
      ) : (
        <div className="mt-3">
          <MiniCalendar />
        </div>
      )}
    </>
  );
}
