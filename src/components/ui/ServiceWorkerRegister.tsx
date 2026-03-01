'use client';

import { useEffect, useRef } from 'react';

const SW_UPDATE_AVAILABLE_EVENT = 'hgh-sw-update-available';
const SW_UPDATE_HIDE_EVENT = 'hgh-sw-update-hide';
const SW_UPDATE_ACCEPT_EVENT = 'hgh-sw-update-accept';
const SW_UPDATE_DISMISS_EVENT = 'hgh-sw-update-dismiss';


export function ServiceWorkerRegister() {
  const updateAvailableRef = useRef(false);
  const reminderDismissedRef = useRef(false);
  const reloadOnControllerChangeRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    const debug = process.env.NODE_ENV !== 'production';
    let onVisibilityChange: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let registrationRef: ServiceWorkerRegistration | null = null;

    const showUpdateNotice = () => {
      if (!updateAvailableRef.current) return;
      if (reminderDismissedRef.current) return;
      window.dispatchEvent(new Event(SW_UPDATE_AVAILABLE_EVENT));
    };

    const markUpdateAvailable = (source: string) => {
      updateAvailableRef.current = true;
      reminderDismissedRef.current = false;

      if (debug) console.info(`[SW] Update verfügbar (${source}).`);
      showUpdateNotice();
    };

    const requestSkipWaiting = async () => {
      const registration = registrationRef;
      if (!registration) return;

      const waitingWorker = registration.waiting as ServiceWorker | null;
      if (waitingWorker) {
        if (debug) console.info('[SW] Sende SKIP_WAITING an wartenden Worker.');
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      try {
        await registration.update();
        const refreshedWaitingWorker = registration.waiting as ServiceWorker | null;
        if (refreshedWaitingWorker) {
          if (debug) console.info('[SW] Worker nach update() wartend, sende SKIP_WAITING.');
          refreshedWaitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (error) {
        if (debug) console.warn('[SW] Skip-Waiting-Versuch fehlgeschlagen:', error);
      }
    };

    const onControllerChange = () => {
      if (refreshing) return;

      const appIsInBackground = document.visibilityState === 'hidden';
      if (!reloadOnControllerChangeRef.current && !appIsInBackground) {
        markUpdateAvailable('controllerchange-visible');
        return;
      }

      refreshing = true;
      window.location.reload();
    };

    const onAcceptUpdate = () => {
      reloadOnControllerChangeRef.current = true;
      reminderDismissedRef.current = false;
      void requestSkipWaiting();
    };

    const onDismissUpdate = () => {
      reminderDismissedRef.current = true;
      window.dispatchEvent(new Event(SW_UPDATE_HIDE_EVENT));
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    window.addEventListener(SW_UPDATE_ACCEPT_EVENT, onAcceptUpdate);
    window.addEventListener(SW_UPDATE_DISMISS_EVENT, onDismissUpdate);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registrationRef = registration;

        const detectWaitingWorker = (source: string) => {
          if (registration.waiting) {
            markUpdateAvailable(source);
          }
        };

        detectWaitingWorker('register');

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              detectWaitingWorker('updatefound-installed');
            }
          });
        });

        registration.update().catch((error) => {
          if (debug) console.warn('[SW] Initiales Update fehlgeschlagen:', error);
        });

        onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((error) => {
              if (debug) console.warn('[SW] Update bei Sichtbarkeitswechsel fehlgeschlagen:', error);
            });

            if (updateAvailableRef.current && reminderDismissedRef.current) {
              reminderDismissedRef.current = false;
              showUpdateNotice();
            }
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

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
      window.removeEventListener(SW_UPDATE_ACCEPT_EVENT, onAcceptUpdate);
      window.removeEventListener(SW_UPDATE_DISMISS_EVENT, onDismissUpdate);
      if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}

export const SERVICE_WORKER_UPDATE_EVENTS = {
  available: SW_UPDATE_AVAILABLE_EVENT,
  hide: SW_UPDATE_HIDE_EVENT,
  accept: SW_UPDATE_ACCEPT_EVENT,
  dismiss: SW_UPDATE_DISMISS_EVENT,
} as const;
