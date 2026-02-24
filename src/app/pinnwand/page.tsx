import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncements } from '@/lib/announcements/server';

export default async function PinnwandPage() {
  const items = await getAnnouncements();

  return (
    <div className="card surface">
      <h2 className="text-lg font-bold mb-3">Pinnwand</h2>
      <AnnouncementList items={items} />
    </div>
  );
}
