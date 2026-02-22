'use client';

import { useEffect, useState } from 'react';
import { CLASSES, SchoolClass } from '@/lib/timetable/types';
import { loadSelectedClass, saveSelectedClass } from '@/lib/storage/preferences';
import { useRouter } from 'next/navigation';

export function ClassSelector({ redirectToSchedule = false }: { redirectToSchedule?: boolean }) {
  const [selected, setSelected] = useState<SchoolClass | ''>('');
  const router = useRouter();

  useEffect(() => {
    const stored = loadSelectedClass();
    if (stored) setSelected(stored);
  }, []);

  const onSave = () => {
    if (!selected) return;
    saveSelectedClass(selected);
    if (redirectToSchedule) router.push('/stundenplan');
  };

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold">Klasse auswählen</h2>
      <select
        className="w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-600"
        value={selected}
        onChange={(e) => setSelected(e.target.value as SchoolClass)}
      >
        <option value="">Bitte wählen…</option>
        {CLASSES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button className="btn-primary" type="button" onClick={onSave} disabled={!selected}>
        Speichern
      </button>
    </div>
  );
}
