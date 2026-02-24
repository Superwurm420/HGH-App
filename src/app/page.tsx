import { ClassSelector } from '@/components/schedule/ClassSelector';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { TodaySchedule } from '@/components/schedule/TodaySchedule';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { Countdown } from '@/components/ui/Countdown';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncements } from '@/lib/announcements/server';
import { DailyMessage } from '@/components/ui/DailyMessage';
import { GoogleCalendar } from '@/components/ui/GoogleCalendar';
import messagesData from '@/generated/messages-data.json';
import calendarData from '@/generated/calendar-data.json';

export default async function HomePage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);
  const calendarUrls = (calendarData as { urls: string[] }).urls ?? [];

  if (!plan) {
    return (
      <>
        <div className="card surface">
          <h2 className="text-lg font-bold">Heute</h2>
          <Countdown />
          <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
        </div>
        <DailyMessage messages={messagesData as Record<string, unknown>} />
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
  const announcements = await getAnnouncements();

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />

      <div className="card surface">
        <h2 className="text-lg font-bold">Heute</h2>
        <Countdown />

        <div className="flex flex-wrap items-end gap-3 mt-2 mb-3">
          <ClassSelector classes={plan.availableClasses} />
          <p className="text-xs text-muted">KW {plan.latest.kw} · {plan.latest.filename.replace('.pdf', '')}</p>
        </div>

        <TodaySchedule
          schoolClass={plan.schoolClass}
          day={plan.todayKey}
          lessons={plan.week[plan.todayKey]}
          events={events}
        />
      </div>

      <DailyMessage
        messages={messagesData as Record<string, unknown>}
        schoolClass={plan.schoolClass}
      />

      {calendarUrls.length > 0 ? (
        <GoogleCalendar urls={calendarUrls} />
      ) : (
        <div className="mt-3">
          <MiniCalendar />
        </div>
      )}

      {announcements.length > 0 && (
        <div className="card surface mt-3">
          <h2 className="text-lg font-bold mb-3">Ankündigungen</h2>
          <AnnouncementList items={announcements} />
        </div>
      )}
    </>
  );
}
