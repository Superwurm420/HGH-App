'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { loadSeenTimetableVersion, saveSeenTimetableVersion } from '@/lib/storage/preferences';

/**
 * Abfragetakt. Bewusst großzügig: Inhalte ändern sich hier höchstens ein paar
 * Mal pro Woche, die Abfrage lief aber jede Minute — auf dem Cloudflare-Gratis-
 * Abo (100.000 Anfragen pro Tag) ist der Wandbildschirm damit allein bei 1.440
 * Anfragen täglich, jedes Schülergerät bei bis zu 480. Fünf Minuten kosten ein
 * Fünftel davon, ohne dass jemand einen Unterschied bemerkt.
 */
const POLL_MS = 300_000;

/**
 * Nach einem Fehler wird der Abstand verdoppelt (bis zu einer Stunde). Ist das
 * Netz weg oder der Worker am Tageslimit, hämmert die App nicht weiter dagegen.
 */
const MAX_POLL_MS = 3_600_000;

/**
 * Kürzester Abstand zwischen zwei Abfragen. Ohne diese Bremse löst jeder
 * Wechsel in die App eine eigene Abfrage aus — beim Hin- und Herschalten
 * zwischen Apps sind das schnell mehr Anfragen als der Minutentakt vorher.
 */
const MIN_GAP_MS = 60_000;

/**
 * Hält die angezeigten Inhalte aktuell und meldet einen neuen Stundenplan.
 *
 * Inhaltliche Änderungen (Ankündigungen, Termine, Einstellungen) werden still
 * nachgeladen — dafür gibt es keinen Hinweis, das wäre nur Lärm. Gemeldet wird
 * ausschließlich ein **neuer Stundenplan**: Dafür liefert `/api/bootstrap` einen
 * eigenen Stempel, der mit dem zuletzt gesehenen aus dem lokalen Speicher
 * verglichen wird. Weil der Wert dort liegt und nicht nur im Arbeitsspeicher,
 * erscheint der Hinweis auch, wenn der Plan zwischen zwei App-Starts wechselte.
 *
 * Auf der TV-Ansicht bleibt der Hinweis aus: Dort steht niemand, der ihn
 * wegklicken könnte — der Bildschirm aktualisiert sich ohnehin von selbst.
 */
export function TimetableAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const seenRef = useRef<string | null>(null);

  const silent = pathname?.startsWith('/tv') ?? false;
  const silentRef = useRef(silent);
  silentRef.current = silent;

  useEffect(() => {
    let etag: string | null = null;
    let running = false;
    let lastCheckAt = 0;
    let delay = POLL_MS;
    let timerId: number | null = null;
    let stopped = false;
    const debug = process.env.NODE_ENV !== 'production';

    const checkTimetableVersion = (version: unknown) => {
      if (typeof version !== 'string' || version.length === 0) return;

      const seen = seenRef.current ?? loadSeenTimetableVersion();
      seenRef.current = seen;

      // Beim allerersten Besuch gibt es nichts zu melden — nur zu merken.
      if (seen === null) {
        seenRef.current = version;
        saveSeenTimetableVersion(version);
        return;
      }

      if (seen === version) return;

      if (silentRef.current) {
        seenRef.current = version;
        saveSeenTimetableVersion(version);
        return;
      }

      setPendingVersion(version);
    };

    const check = async () => {
      if (running || document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheckAt < MIN_GAP_MS) return;
      running = true;
      lastCheckAt = Date.now();
      try {
        const response = await fetch('/api/bootstrap', {
          method: 'GET',
          cache: 'no-store',
          headers: etag ? { 'If-None-Match': etag } : {},
        });

        if (response.status === 304) {
          delay = POLL_MS;
          return;
        }
        if (!response.ok) {
          if (debug) console.warn('[TT_BOOTSTRAP_FETCH_FAILED]', response.status);
          delay = Math.min(delay * 2, MAX_POLL_MS);
          return;
        }

        delay = POLL_MS;

        const nextEtag = response.headers.get('etag');
        const payload = (await response.json().catch(() => null)) as { timetable?: unknown } | null;
        checkTimetableVersion(payload?.timetable);

        if (!etag) {
          etag = nextEtag;
          return;
        }

        if (nextEtag && nextEtag !== etag) {
          etag = nextEtag;
          router.refresh();
          return;
        }

        etag = nextEtag;
      } catch (error) {
        if (debug) console.warn('[TT_BOOTSTRAP_NETWORK_FAILED]', error);
        delay = Math.min(delay * 2, MAX_POLL_MS);
      } finally {
        running = false;
      }
    };

    // Kein festes Intervall: Der nächste Termin wird erst nach der Antwort
    // gesetzt, damit der Rückfalltakt aus `delay` überhaupt greifen kann.
    const schedule = () => {
      if (stopped) return;
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(async () => {
        await check();
        schedule();
      }, delay);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check().then(schedule);
      }
    };

    void check().then(schedule);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [router]);

  const acknowledge = useCallback(() => {
    if (pendingVersion) {
      seenRef.current = pendingVersion;
      saveSeenTimetableVersion(pendingVersion);
    }
    setPendingVersion(null);
  }, [pendingVersion]);

  if (!pendingVersion) return null;

  return (
    // Der Hinweis setzt über der schwebenden Navigationsleiste auf — beide
    // rechnen mit demselben Wert, sonst überdeckt er die Schaltflächen.
    <div
      role="status"
      className="fixed left-1/2 z-50 w-[min(92vw,540px)] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[var(--surface2)] p-4 shadow-2xl backdrop-blur-xl"
      style={{ bottom: 'var(--nav-clearance)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--text)]">Neuer Stundenplan verfügbar</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              acknowledge();
              router.refresh();
            }}
          >
            Anzeigen
          </button>
          <button type="button" className="btn secondary" onClick={acknowledge}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
