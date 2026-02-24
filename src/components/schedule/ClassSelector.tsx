'use client';

import { useEffect, useState } from 'react';
import { loadSelectedClass, saveSelectedClass } from '@/lib/storage/preferences';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function ClassSelector({ classes }: { classes: string[] }) {
  const [selected, setSelected] = useState<string>('');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const stored = loadSelectedClass();
    const fromUrl = searchParams.get('klasse');
    if (fromUrl && classes.includes(fromUrl)) {
      setSelected(fromUrl);
    } else if (stored && classes.includes(stored)) {
      setSelected(stored);
    } else if (classes.length > 0) {
      setSelected(classes[0]);
    }
  }, [classes, searchParams]);

  const onChange = (value: string) => {
    setSelected(value);
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
