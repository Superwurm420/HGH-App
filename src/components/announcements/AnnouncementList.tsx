import { Announcement } from '@/lib/announcements/parser';

export function AnnouncementList({ items }: { items: Announcement[] }) {
  if (items.length === 0) {
    return <div className="card text-sm">Keine aktiven Pinnwand-Beiträge vorhanden.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.file} className="card">
          <h3 className="text-lg font-semibold">{item.title ?? 'Ohne Titel'}</h3>
          <p className="text-xs text-slate-500">Datei: {item.file}</p>
          <p className="text-sm">Datum: {item.date ?? 'nicht angegeben'}</p>
          {item.audience ? <p className="text-sm">Zielgruppe: {item.audience}</p> : null}
          {item.expires ? <p className="text-sm">Gültig bis: {item.expires}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.body || 'Kein Text hinterlegt.'}</p>
          {item.warnings.length > 0 ? (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs dark:border-amber-700 dark:bg-amber-900/20">
              Warnung: {item.warnings.join(' ')}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
