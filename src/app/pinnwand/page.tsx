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
        <h2 className="section-title">Pinnwand</h2>
        <p className="text-sm text-muted">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const items = await getAnnouncementsByClass(plan.schoolClass);

  return (
    <>
      <ClassFromStorage classes={plan.availableClasses} />
      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Pinnwand</h2>
          <div className="section-actions">
            <ClassSelector classes={plan.availableClasses} />
          </div>
        </div>
        <AnnouncementList items={items} />
      </div>
    </>
  );
}
