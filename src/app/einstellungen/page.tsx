import { AppHeader } from '@/components/ui/AppHeader';
import { ClassSelector } from '@/components/schedule/ClassSelector';

export default function EinstellungenPage() {
  return (
    <main>
      <AppHeader />
      <section className="mb-4 card">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Hier kannst du deine Klasse jederzeit anpassen.</p>
      </section>
      <ClassSelector />
    </main>
  );
}
