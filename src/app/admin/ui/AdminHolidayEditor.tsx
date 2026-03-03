'use client';

import { useCallback, useEffect, useState } from 'react';

type HolidayRange = { start: string; end: string };

export function AdminHolidayEditor() {
  const [ranges, setRanges] = useState<HolidayRange[]>([]);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadRanges = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/holidays', { cache: 'no-store' });
      const payload = (await response.json()) as { ranges?: HolidayRange[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Ferien konnten nicht geladen werden.');
        return;
      }
      setRanges(
        (payload.ranges ?? []).sort((a, b) => a.start.localeCompare(b.start)),
      );
      setError(null);
    } catch {
      setError('Ferien konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    loadRanges();
  }, [loadRanges]);

  async function save(nextRanges: HolidayRange[]) {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranges: nextRanges }),
      });

      const payload = (await response.json()) as { ranges?: HolidayRange[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Speichern fehlgeschlagen.');
        setStatus('Speichern fehlgeschlagen.');
        return;
      }

      setRanges(
        (payload.ranges ?? nextRanges).sort((a, b) => a.start.localeCompare(b.start)),
      );
      setStatus('Gespeichert.');
    } catch {
      setError('Speichern fehlgeschlagen.');
      setStatus('Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function addRange() {
    if (!newStart || !newEnd) {
      setError('Bitte Start- und Enddatum angeben.');
      return;
    }

    if (newStart > newEnd) {
      setError('Startdatum darf nicht nach dem Enddatum liegen.');
      return;
    }

    const exists = ranges.some((r) => r.start === newStart && r.end === newEnd);
    if (exists) {
      setError('Dieser Zeitraum ist bereits vorhanden.');
      return;
    }

    const nextRanges = [...ranges, { start: newStart, end: newEnd }];
    setNewStart('');
    setNewEnd('');
    save(nextRanges);
  }

  function removeRange(index: number) {
    const nextRanges = ranges.filter((_, i) => i !== index);
    save(nextRanges);
  }

  function formatDate(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  return (
    <section className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-2 text-lg font-semibold">Schulferien (Niedersachsen)</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Ferienzeiten verwalten. Diese werden für die Tages-Meldungen verwendet.
      </p>

      <ul className="space-y-2">
        {ranges.map((range, index) => (
          <li key={index} className="flex items-center gap-2 rounded border border-gray-200 p-2 dark:border-gray-700">
            <span className="flex-1 text-sm">
              {formatDate(range.start)} — {formatDate(range.end)}
            </span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => removeRange(index)}
              className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
            >
              Entfernen
            </button>
          </li>
        ))}
        {ranges.length === 0 && (
          <li className="text-sm text-gray-500">Keine Ferienzeiten vorhanden.</li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium">
          Startdatum
          <input
            type="date"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block text-sm font-medium">
          Enddatum
          <input
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <button
          type="button"
          disabled={isBusy || !newStart || !newEnd}
          onClick={addRange}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>

      {status && <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Status: {status}</p>}
      {error && <p className="mt-1 text-sm text-red-600">Fehler: {error}</p>}
    </section>
  );
}
