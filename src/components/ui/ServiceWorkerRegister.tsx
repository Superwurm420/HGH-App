'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // bewusst stumm
    });

    // Seite neu laden, sobald ein neuer Service Worker die Kontrolle übernimmt.
    // Da der SW skipWaiting() + clients.claim() nutzt, passiert dies kurz nach
    // dem nächsten Deployment – der Nutzer sieht sofort die aktuellen Inhalte.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  return null;
}
