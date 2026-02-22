import { AppHeader } from '@/components/ui/AppHeader';
import { ClassSelector } from '@/components/schedule/ClassSelector';
import { getWeeklyPlanForClass } from '@/lib/timetable/server';

export default async function EinstellungenPage({ searchParams }: { searchParams: { klasse?: string } }) {
  const plan = await getWeeklyPlanForClass(searchParams.klasse);

  return (
    <main>
      <AppHeader />
      <section className="mb-4 card">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Hier kannst du deine Klasse jederzeit anpassen.</p>
      </section>
      {plan ? <ClassSelector classes={plan.availableClasses} /> : <p className="text-sm text-rose-600">Keine Klassen aus PDF erkannt.</p>}
    </main>
  );
}
