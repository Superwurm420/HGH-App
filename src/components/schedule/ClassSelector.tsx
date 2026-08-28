'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { loadSelectedClass, saveSelectedClass } from '@/lib/storage/preferences';
import { resolveSelectedClass } from '@/lib/timetable/select-class';

export function ClassSelector({ classes }: { classes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dieselbe Auswahllogik wie auf dem Server — sonst zeigt das Feld eine andere
  // Klasse an als der Stundenplan darunter.
  const selected = resolveSelectedClass(classes, searchParams.get('klasse'), loadSelectedClass()) ?? '';

  const onChange = (value: string) => {
    saveSelectedClass(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('klasse', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted">Klasse</span>
      <select
        className="select"
        style={{ width: 'auto', paddingRight: '36px' }}
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        {classes.map((code) => (
          <option key={code} value={code}>{code}</option>
        ))}
      </select>
    </label>
  );
}
