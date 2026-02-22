'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { loadSelectedClass } from '@/lib/storage/preferences';

export function ClassFromStorage() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const current = search.get('klasse');
    const stored = loadSelectedClass();
    if (!stored || stored === current) return;
    const params = new URLSearchParams(search.toString());
    params.set('klasse', stored);
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, search]);

  return null;
}
