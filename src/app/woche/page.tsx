import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { WeekSchedule } from '@/components/schedule/WeekSchedule';
import { fetchTimetable } from '@/lib/api/client';
import { Weekday, WeekPlan } from '@/lib/timetable/types';

export default async function WochePage({ searchParams }: { searchParams: { klasse?: string } }) {
  let plan: Awaited<ReturnType<typeof fetchTimetable>> | null = null;

  try {
    plan = await fetchTimetable(searchParams.klasse);
  } catch {
    /* ignore */
  }

  if (!plan || !plan.upload || plan.classes.length === 0) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold">Wochenübersicht</h2>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const selectedClass = searchParams.klasse && plan.entries[searchParams.klasse]
    ? searchParams.klasse
    : plan.classes[0];

  const week = plan.entries[selectedClass] as WeekPlan;
  const todayKey = plan.todayKey as Weekday;

  return (
    <>
      <ClassFromStorage classes={plan.classes} />
      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Wochenübersicht</h2>
          <div className="section-actions">
            <ClassSelector classes={plan.classes} />
          </div>
        </div>

        <WeekSchedule schoolClass={selectedClass} week={week} todayKey={todayKey} />

        {plan.upload?.updated_at && (
          <p className="meta-note">
            Aktualisiert: {new Date(plan.upload.updated_at).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
    </>
  );
}
