'use client';

import { useEffect } from 'react';

/**
 * Registriert den Service Worker und hält ihn still aktuell.
 *
 * Bewusst ohne Hinweis an den Nutzer: Ein App-Update ist nichts, wozu jemand
 * eine Entscheidung treffen müsste — gemeldet wird nur ein neuer Stundenplan
 * (`TimetableAutoRefresh`). Eine neue Fassung übernimmt deshalb sofort, und
 * neu geladen wird erst, wenn die App im Hintergrund liegt. So springt die
 * Seite niemandem unter den Händen weg.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    let reloadWhenHidden = false;
    const debug = process.env.NODE_ENV !== 'production';
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let registrationRef: ServiceWorkerRegistration | null = null;

    const activateWaitingWorker = (source: string) => {
      const waitingWorker = registrationRef?.waiting;
      if (!waitingWorker) return;

      if (debug) console.info(`[SW] Neue Fassung übernimmt (${source}).`);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    };

    const reload = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      if (document.visibilityState === 'hidden') {
        reload();
        return;
      }

      // Im Blick des Nutzers wird nicht neu geladen — der Wechsel wartet, bis
      // die App weggelegt wird.
      reloadWhenHidden = true;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (reloadWhenHidden) reload();
        return;
      }

      registrationRef?.update().catch((error) => {
        if (debug) console.warn('[SW] Update bei Sichtbarkeitswechsel fehlgeschlagen:', error);
      });
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registrationRef = registration;

        activateWaitingWorker('register');

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker('updatefound-installed');
            }
          });
        });

        registration.update().catch((error) => {
          if (debug) console.warn('[SW] Initiales Update fehlgeschlagen:', error);
        });

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
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}
