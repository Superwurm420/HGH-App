import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { DayTimetable } from '@/components/schedule/DayTimetable';
import { TimetableMeta } from '@/components/schedule/TimetableMeta';
import { announcementsToEvents, loadAnnouncements, loadSchedulePage } from '@/server/page-data';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ klasse?: string }> };

export default async function StundenplanPage({ searchParams }: PageProps) {
  const { klasse } = await searchParams;
  const { timetable, selectedClass, hasTimetable } = await loadSchedulePage(klasse);

  if (!hasTimetable || !selectedClass) {
    return (
      <div className="card surface">
        <h1 className="section-title">Stundenplan</h1>
        <p className="text-sm text-muted mt-2">Kein Stundenplan verfügbar.</p>
      </div>
    );
  }

  const week = timetable.entries[selectedClass];
  const announcements = await loadAnnouncements(selectedClass);

  return (
    <>
      <ClassFromStorage classes={timetable.classes} />
      <div className="card surface">
        <div className="section-header">
          <h1 className="section-title">Stundenplan</h1>
          <div className="section-actions">
            <ClassSelector classes={timetable.classes} />
          </div>
        </div>

        <DayTimetable
          week={week}
          todayKey={timetable.todayKey}
          events={announcementsToEvents(announcements)}
        />

        <TimetableMeta upload={timetable.upload} />
      </div>
    </>
  );
}
