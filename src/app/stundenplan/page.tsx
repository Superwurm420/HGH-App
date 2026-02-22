import { AppHeader } from '@/components/ui/AppHeader';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { StatusHint } from '@/components/ui/StatusHint';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { WeekSchedule } from '@/components/schedule/WeekSchedule';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { ClassSelector } from '@/components/schedule/ClassSelector';

export default async function StundenplanPage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);

  return (
    <main>
      <AppHeader />
      {!plan ? (
        <p className="text-sm text-rose-600">Keine gültige Stundenplan-PDF gefunden.</p>
      ) : (
        <>
          <ClassFromStorage classes={plan.availableClasses} />
          <ClassSelector classes={plan.availableClasses} />
          <div className="mb-3 mt-4">
            <StatusHint lastUpdated={plan?.latest.filename ?? null} />
          </div>
          <div className="card mb-4">
            <a className="btn-primary" href={plan.latest.href} target="_blank" rel="noreferrer">
              Original-PDF anzeigen
            </a>
          </div>
          <WeekSchedule schoolClass={plan.schoolClass} week={plan.week} events={await getSpecialEventsByClass(plan.schoolClass)} />
        </>
      )}
    </main>
  );
}
