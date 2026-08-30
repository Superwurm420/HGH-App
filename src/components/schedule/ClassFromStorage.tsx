'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { loadSelectedClass, syncSelectedClassCookie } from '@/lib/storage/preferences';
import { matchClass } from '@/lib/timetable/select-class';

/**
 * Stellt die zuletzt gewählte Klasse wieder her, indem `?klasse=` in der URL
 * ergänzt wird.
 *
 * Der Vergleich läuft über `matchClass`, also unabhängig von der Schreibweise —
 * sonst würde eine abweichend geschriebene gespeicherte Klasse bei jedem
 * Seitenaufruf erneut eine Navigation auslösen.
 */
export function ClassFromStorage({ classes }: { classes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const stored = matchClass(classes, loadSelectedClass());
    if (!stored) return;

    // Geräte, die die App schon vor dem Cookie benutzt haben, tragen ihre
    // gespeicherte Klasse hier nach — sonst rendert der Server für sie
    // weiterhin die erste Klasse des Plans.
    syncSelectedClassCookie(stored);

    const current = matchClass(classes, search.get('klasse'));
    if (current === stored) return;

    const params = new URLSearchParams(search.toString());
    params.set('klasse', stored);
    router.replace(`${pathname}?${params.toString()}`);
  }, [classes, pathname, router, search]);

  return null;
}
