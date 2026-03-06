import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { ClassFromStorage } from '@/components/schedule/ClassFromStorage';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { fetchTimetable, fetchAnnouncements, type AnnouncementData } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

function toDisplayAnnouncement(a: AnnouncementData) {
  return {
    id: a.id,
    title: a.title,
    date: a.date,
    expires: a.expires ?? undefined,
    body: a.body,
    highlight: a.highlight === 1,
  };
}

export default async function PinnwandPage({ searchParams }: { searchParams: { klasse?: string } }) {
  let classes: string[] = [];
  let announcements: AnnouncementData[] = [];

  try {
    const plan = await fetchTimetable(searchParams.klasse);
    classes = plan.classes;

    const selectedClass = searchParams.klasse && plan.entries[searchParams.klasse]
      ? searchParams.klasse
      : plan.classes[0];

    const res = await fetchAnnouncements(selectedClass);
    announcements = res.announcements;
  } catch {
    // Versuche Announcements auch ohne Timetable zu laden
    try {
      const res = await fetchAnnouncements();
      announcements = res.announcements;
    } catch { /* ignore */ }
  }

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
