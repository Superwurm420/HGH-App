'use client';

import { useEffect, useState } from 'react';
import { loadSelectedClass, saveSelectedClass } from '@/lib/storage/preferences';
import { useRouter } from 'next/navigation';

export function ClassSelector({
  classes,
  redirectToSchedule = false,
}: {
  classes: string[];
  redirectToSchedule?: boolean;
}) {
  const [selected, setSelected] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const stored = loadSelectedClass();
    if (stored && classes.includes(stored)) {
      setSelected(stored);
      return;
    }

    if (!stored && classes.length > 0) {
      setSelected(classes[0]);
    }
  }, [classes]);

  const onSave = () => {
    if (!selected) return;
    saveSelectedClass(selected);
    if (redirectToSchedule) router.push(`/stundenplan?klasse=${encodeURIComponent(selected)}`);
  };

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold">Klasse auswählen</h2>
      <select
        className="w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-600"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Bitte wählen…</option>
        {classes.map((c) => (
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
