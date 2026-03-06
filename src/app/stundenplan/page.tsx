import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { DayTimetable } from '@/components/schedule/DayTimetable';
import { fetchTimetable, fetchAnnouncements } from '@/lib/api/client';
import { Weekday, WeekPlan } from '@/lib/timetable/types';

export const dynamic = 'force-dynamic';

export default async function StundenplanPage({ searchParams }: { searchParams: { klasse?: string } }) {
  let plan: Awaited<ReturnType<typeof fetchTimetable>> | null = null;

  try {
    plan = await fetchTimetable(searchParams.klasse);
  } catch {
    /* ignore */
  }

  if (!plan || !plan.upload || plan.classes.length === 0) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold">Stundenplan</h2>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const selectedClass = searchParams.klasse && plan.entries[searchParams.klasse]
    ? searchParams.klasse
    : plan.classes[0];

  const week = plan.entries[selectedClass] as WeekPlan;
  const todayKey = plan.todayKey as Weekday;

  // Highlighted announcements as events
  let events: Array<{ id: string; title: string; startsAt: string; endsAt?: string; audience?: string; classes: string[] | 'alle' }> = [];
  try {
    const announcementRes = await fetchAnnouncements(selectedClass);
    events = announcementRes.announcements
      .filter((a) => a.highlight === 1)
      .map((a) => ({
        id: a.id,
        title: a.title,
        startsAt: a.date,
        endsAt: a.expires ?? undefined,
        audience: a.audience,
        classes: a.classes ? a.classes.split(',').map((c) => c.trim()) : ('alle' as const),
      }));
  } catch { /* ignore */ }

  return (
    <>
      <ClassFromStorage classes={plan.classes} />
      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Stundenplan</h2>
          <div className="section-actions">
            <ClassSelector classes={plan.classes} />
          </div>
        </div>

        <DayTimetable week={week} todayKey={todayKey} events={events} />

        {plan.upload?.updated_at && (
          <p className="meta-note">
            Aktualisiert: {new Date(plan.upload.updated_at).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
    </>
  );
}
