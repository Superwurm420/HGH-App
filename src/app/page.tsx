import { AppHeader } from '@/components/ui/AppHeader';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { Clock } from '@/components/ui/Clock';
import { CLASSES, SchoolClass } from '@/lib/timetable/types';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { getSpecialEventsByClass } from '@/lib/announcements/server';
import { TodaySchedule } from '@/components/schedule/TodaySchedule';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';

export default async function HomePage({ searchParams }: { searchParams: { klasse?: string } }) {
  const schoolClass = CLASSES.includes(searchParams.klasse as SchoolClass)
    ? (searchParams.klasse as SchoolClass)
    : CLASSES[0];

  const plan = await getWeeklyPlanForClass(schoolClass);
  const events = await getSpecialEventsByClass(schoolClass);

  return (
    <main>
      <ClassFromStorage />
      <AppHeader />
      <section className="card mb-4 space-y-3">
        <h1 className="text-2xl font-bold">HGH – Heute</h1>
        <Clock />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Klasse wählen und direkt den heutigen Unterricht sehen.
        </p>
      </section>
      <ClassSelector />
      {plan ? (
        <div className="mt-4">
          <TodaySchedule schoolClass={schoolClass} day={plan.todayKey} lessons={plan.week[plan.todayKey]} events={events} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-rose-600">Keine gültige Stundenplan-PDF gefunden.</p>
      )}
    </main>
  );
}
