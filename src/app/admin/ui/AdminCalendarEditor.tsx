'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatApiStatus, parseApiError, parseRequestFailure } from './apiError';

export function AdminCalendarEditor() {
  const [urls, setUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastApiStatus, setLastApiStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadUrls = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/calendar', { cache: 'no-store' });
      setLastApiStatus(formatApiStatus(response));
      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        return;
      }
      const payload = (await response.json()) as { urls?: string[]; error?: string };
      setUrls(payload.urls ?? []);
      setError(null);
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
    }
  }, []);

  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  async function save(nextUrls: string[]) {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: nextUrls }),
      });
      setLastApiStatus(formatApiStatus(response));

      if (!response.ok) {
        const apiError = await parseApiError(response);
        setError(apiError.message);
        setStatus('Speichern fehlgeschlagen.');
        return;
      }

      const payload = (await response.json()) as { urls?: string[]; error?: string };
      setUrls(payload.urls ?? nextUrls);
      setStatus('Gespeichert.');
      setError(null);
    } catch (caughtError) {
      const apiError = parseRequestFailure(caughtError);
      setLastApiStatus(null);
      setError(apiError.message);
      setStatus('Speichern fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function addUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('https://calendar.google.com/')) {
      setError('Bitte eine gültige Google-Kalender-URL eingeben (https://calendar.google.com/...).');
      return;
    }

    if (urls.includes(trimmed)) {
      setError('Diese URL ist bereits vorhanden.');
      return;
    }

    const nextUrls = [...urls, trimmed];
    setNewUrl('');
    save(nextUrls);
  }

  function removeUrl(index: number) {
    const nextUrls = urls.filter((_, i) => i !== index);
    save(nextUrls);
  }

  return (
    <section className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-2 text-lg font-semibold">Kalender-URLs</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Google-Kalender-Einbettungs-URLs verwalten. Diese werden auf der Startseite als eingebetteter Kalender angezeigt.
      </p>

      <ul className="space-y-2">
        {urls.map((url, index) => (
          <li key={index} className="flex items-start gap-2 rounded border border-gray-200 p-2 dark:border-gray-700">
            <span className="min-w-0 flex-1 break-all text-sm font-mono">{url}</span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => removeUrl(index)}
              className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
            >
              Entfernen
            </button>
          </li>
        ))}
        {urls.length === 0 && (
          <li className="text-sm text-gray-500">Keine Kalender-URLs vorhanden.</li>
        )}
      </ul>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          Neue Google-Kalender-URL
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            className="mt-1 w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
        </label>
        <button
          type="button"
          disabled={isBusy || !newUrl.trim()}
          onClick={addUrl}
          className="mt-2 rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>

      {status && <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Status: {status}</p>}
      {lastApiStatus ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Letzter API-Status: {lastApiStatus}</p> : null}
      {error && <p className="mt-1 text-sm text-red-600">Fehler: {error}</p>}
    </section>
  );
}
