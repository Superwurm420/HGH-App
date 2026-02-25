'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Seite einmal neu laden, sobald ein neuer Service Worker die Kontrolle übernimmt.
    // Guard verhindert Doppel-Reloads.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Sofort nach Registration auf Updates prüfen
        registration.update().catch(() => {});

        // Bei Sichtbarkeits-Wechsel (App kommt in den Vordergrund) Update prüfen
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Periodisch alle 60 s prüfen (nur wenn Tab sichtbar)
        const interval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        }, 60_000);

        return () => {
          document.removeEventListener('visibilitychange', onVisibilityChange);
          clearInterval(interval);
        };
      })
      .catch(() => {});
  }, []);

  return null;
}
