import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { WeekSchedule } from '@/components/schedule/WeekSchedule';
import { loadSchedulePage } from '@/server/page-data';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ klasse?: string }> };

export default async function WochePage({ searchParams }: PageProps) {
  const { klasse } = await searchParams;
  const { timetable, selectedClass, hasTimetable } = await loadSchedulePage(klasse);

  if (!hasTimetable || !selectedClass) {
    return (
      <div className="card surface">
        <h2 className="text-lg font-bold">Wochenübersicht</h2>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  return (
    <>
      <ClassFromStorage classes={timetable.classes} />
      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Wochenübersicht</h2>
          <div className="section-actions">
            <ClassSelector classes={timetable.classes} />
          </div>
        </div>

        <WeekSchedule week={timetable.entries[selectedClass]} todayKey={timetable.todayKey} />

        {timetable.upload?.updated_at && (
          <p className="meta-note">
            Aktualisiert: {new Date(timetable.upload.updated_at).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
    </>
  );
}
