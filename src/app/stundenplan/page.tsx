import { AppHeader } from '@/components/ui/AppHeader';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { CLASSES, SchoolClass } from '@/lib/timetable/types';
import { StatusHint } from '@/components/ui/StatusHint';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { WeekSchedule } from '@/components/schedule/WeekSchedule';

export default async function StundenplanPage({ searchParams }: { searchParams: { klasse?: string } }) {
  const schoolClass = CLASSES.includes(searchParams.klasse as SchoolClass)
    ? (searchParams.klasse as SchoolClass)
    : CLASSES[0];

  const plan = await getWeeklyPlanForClass(schoolClass);

  return (
    <main>
      <ClassFromStorage />
      <AppHeader />
      <div className="mb-3">
        <StatusHint lastUpdated={plan?.latest.filename ?? null} />
      </div>
      {!plan ? (
        <p className="text-sm text-rose-600">Keine gültige Stundenplan-PDF gefunden.</p>
      ) : (
        <>
          <div className="card mb-4">
            <a className="btn-primary" href={plan.latest.href} target="_blank" rel="noreferrer">
              Original-PDF anzeigen
            </a>
          </div>
          <WeekSchedule schoolClass={schoolClass} week={plan.week} />
        </>
      )}
    </main>
  );
}
