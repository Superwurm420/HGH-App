import { AppHeader } from '@/components/ui/AppHeader';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { getAnnouncements } from '@/lib/announcements/server';

export default async function PinnwandPage() {
  const items = await getAnnouncements();

  return (
    <main>
      <AppHeader />
      <section className="mb-4 card">
        <h1 className="text-2xl font-bold">Pinnwand</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Beiträge werden aus TXT-Dateien gelesen. Bei Teilfehlern zeigen wir erkannte Inhalte plus Warnung.
        </p>
      </section>
      <AnnouncementList items={items} />
    </main>
  );
}
