'use client';

import { useEffect, useState } from 'react';
import { SERVICE_WORKER_UPDATE_EVENTS } from './ServiceWorkerRegister';

export function UpdateNotice() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onShow = () => {
      setVisible(true);
      setUpdating(false);
    };

    const onHide = () => {
      setVisible(false);
      setUpdating(false);
    };

    window.addEventListener(SERVICE_WORKER_UPDATE_EVENTS.available, onShow);
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENTS.hide, onHide);

    return () => {
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENTS.available, onShow);
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENTS.hide, onHide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,540px)] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[var(--surface2)] p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--text)]">Neue Version verfügbar – Jetzt aktualisieren</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setUpdating(true);
              window.dispatchEvent(new Event(SERVICE_WORKER_UPDATE_EVENTS.accept));
            }}
            disabled={updating}
          >
            {updating ? 'Aktualisiere …' : 'Jetzt aktualisieren'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setVisible(false);
              setUpdating(false);
              window.dispatchEvent(new Event(SERVICE_WORKER_UPDATE_EVENTS.dismiss));
            }}
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
