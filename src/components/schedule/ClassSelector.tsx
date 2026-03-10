'use client';

import { loadSelectedClass, saveSelectedClass } from '@/lib/storage/preferences';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function resolveSelectedClass(classes: string[], fromUrl: string | null, stored: string | null): string {
  if (fromUrl && classes.includes(fromUrl)) return fromUrl;
  if (stored && classes.includes(stored)) return stored;
  return classes[0] ?? '';
}

export function ClassSelector({ classes }: { classes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = resolveSelectedClass(classes, searchParams.get('klasse'), loadSelectedClass());

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
        {classes.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
