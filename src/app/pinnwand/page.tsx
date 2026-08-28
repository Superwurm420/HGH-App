import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';

import { loadAnnouncements, loadSchedulePage, toDisplayAnnouncement } from '@/server/page-data';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ klasse?: string }> };

export default async function PinnwandPage({ searchParams }: PageProps) {
  const { klasse } = await searchParams;
  const { timetable, selectedClass } = await loadSchedulePage(klasse);

  // Ohne Stundenplan gibt es keine Klassenauswahl — die Pinnwand zeigt dann
  // alle Ankündigungen statt gar keine.
  const announcements = await loadAnnouncements(selectedClass);
  const classes = timetable.classes;

  return (
    <>
      {classes.length > 0 && <ClassFromStorage classes={classes} />}
      <div className="card surface">
        <div className="section-header">
          <h2 className="section-title">Pinnwand</h2>
          {classes.length > 0 && (
            <div className="section-actions">
              <ClassSelector classes={classes} />
            </div>
          )}
        </div>
        <AnnouncementList items={announcements.map(toDisplayAnnouncement)} />
      </div>
    </>
  );
}
