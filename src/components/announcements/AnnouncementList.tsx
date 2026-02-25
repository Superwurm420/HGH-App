import { Announcement } from '@/lib/announcements/parser';
import { AnnouncementItem } from './AnnouncementItem';

export function AnnouncementList({ items }: { items: Announcement[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Keine aktiven Beiträge vorhanden.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <AnnouncementItem key={item.file} {...item} />
      ))}
    </div>
  );
}
