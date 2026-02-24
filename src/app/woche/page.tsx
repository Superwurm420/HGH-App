import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { WeekSchedule } from '@/components/schedule/WeekSchedule';

export default async function WochePage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);

  if (!plan) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold">Wochenübersicht</h2>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const events = await getSpecialEventsByClass(plan.schoolClass);

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />
      <div className="card surface mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Wochenübersicht
            <span className="day-badge ml-2">KW {plan.latest.kw}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <ClassSelector classes={plan.availableClasses} />
            <a className="btn secondary text-sm" href={plan.latest.href} target="_blank" rel="noreferrer">
              PDF-Stundenplan
            </a>
          </div>
        </div>
      </div>
      <div className="card surface">
        <WeekSchedule schoolClass={plan.schoolClass} week={plan.week} events={events} todayKey={plan.todayKey} />
      </div>
    </>
  );
}
