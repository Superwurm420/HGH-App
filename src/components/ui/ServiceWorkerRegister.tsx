'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    const debug = process.env.NODE_ENV !== 'production';
    let onVisibilityChange: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Sofort nach Registration auf Updates prüfen
        registration.update().catch((error) => {
          if (debug) console.warn('[SW] Initiales Update fehlgeschlagen:', error);
        });

        // Bei Sichtbarkeits-Wechsel (App kommt in den Vordergrund) Update prüfen
        onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((error) => {
              if (debug) console.warn('[SW] Update bei Sichtbarkeitswechsel fehlgeschlagen:', error);
            });
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Periodisch alle 60 s prüfen (nur wenn Tab sichtbar)
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((error) => {
              if (debug) console.warn('[SW] Periodisches Update fehlgeschlagen:', error);
            });
          }
        }, 60_000);
      })
      .catch((error) => {
        if (debug) console.warn('[SW] Registrierung fehlgeschlagen:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}
