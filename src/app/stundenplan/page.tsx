import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { DayTimetable } from '@/components/schedule/DayTimetable';

export default async function StundenplanPage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);

  if (!plan) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold">Stundenplan</h2>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const events = await getSpecialEventsByClass(plan.schoolClass);

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />
      <div className="card surface">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold">Stundenplan</h2>
          <div className="flex flex-wrap items-center gap-3">
            <ClassSelector classes={plan.availableClasses} />
            <a className="btn secondary text-sm" href={plan.latest.href} target="_blank" rel="noreferrer">
              PDF
            </a>
          </div>
        </div>

        <DayTimetable week={plan.week} todayKey={plan.todayKey} events={events} />

        {plan.updatedAt && (
          <p className="mt-3 text-xs text-muted">
            Aktualisiert am: {plan.updatedAt}
          </p>
        )}
      </div>
    </>
  );
}
