import { AnnouncementItem } from './AnnouncementItem';

export type DisplayAnnouncement = {
  id: string;
  title: string;
  date: string;
  expires?: string;
  body: string;
  highlight: boolean;
};

export function AnnouncementList({ items }: { items: DisplayAnnouncement[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Keine aktiven Beiträge vorhanden.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <AnnouncementItem key={item.id} {...item} />
      ))}
    </div>
  );
}
