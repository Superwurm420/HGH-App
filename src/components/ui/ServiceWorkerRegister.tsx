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
/**
 * Abstand zwischen zwei Update-Prüfungen. Jede davon lädt `/sw.js` neu (die
 * Datei darf nicht gecacht werden) und kostet damit eine Worker-Anfrage. Im
 * Minutentakt war das ein zweiter Dauerläufer neben `/api/bootstrap`, für etwas,
 * das höchstens nach einem Deploy ein anderes Ergebnis hat.
 */
const UPDATE_INTERVAL_MS = 1_800_000;

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    let reloadWhenHidden = false;
    const debug = process.env.NODE_ENV !== 'production';
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let registrationRef: ServiceWorkerRegistration | null = null;
    let lastUpdateAt = 0;

    /**
     * Prüft auf eine neue Fassung — aber nie öfter als `UPDATE_INTERVAL_MS`.
     * Ohne die Bremse löste jeder App-Wechsel eine eigene `/sw.js`-Anfrage aus.
     */
    const requestUpdate = (source: string) => {
      if (Date.now() - lastUpdateAt < UPDATE_INTERVAL_MS) return;
      lastUpdateAt = Date.now();
      registrationRef?.update().catch((error) => {
        if (debug) console.warn(`[SW] Update fehlgeschlagen (${source}):`, error);
      });
    };

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

      requestUpdate('visibilitychange');
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

        requestUpdate('register');

        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            requestUpdate('interval');
          }
        }, UPDATE_INTERVAL_MS);
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
