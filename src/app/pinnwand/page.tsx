import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncementsByClass } from '@/lib/announcements/server';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';

export default async function PinnwandPage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);

  if (!plan) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold mb-3">Pinnwand</h2>
        <p className="text-sm text-muted">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const items = await getAnnouncementsByClass(plan.schoolClass);

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />
      <div className="card surface">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold">Pinnwand</h2>
          <ClassSelector classes={plan.availableClasses} />
        </div>
        <AnnouncementList items={items} />
      </div>
    </>
  );
}
