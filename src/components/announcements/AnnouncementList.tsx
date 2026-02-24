import { Announcement } from '@/lib/announcements/parser';
import { ExpiryCountdown } from './ExpiryCountdown';

export function AnnouncementList({ items }: { items: Announcement[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Keine aktiven Beiträge vorhanden.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article key={item.file} className="announcement-card">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold">{item.title ?? 'Ohne Titel'}</h3>
            {item.date && <span className="text-xs text-muted whitespace-nowrap">{item.date}</span>}
          </div>

          {item.audience && (
            <p className="text-xs text-muted mb-1">Zielgruppe: {item.audience}</p>
          )}

          <p className="text-sm whitespace-pre-wrap">{item.body || 'Kein Text hinterlegt.'}</p>

          {item.expires && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted">Gültig bis {item.expires}</span>
              <ExpiryCountdown expires={item.expires} />
            </div>
          )}

          {item.warnings.length > 0 && (
            <div className="announcement-card highlight mt-2 text-xs">
              {item.warnings.join(' ')}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
