'use client';

import { useState } from 'react';

import { adminChangePassword } from '@/lib/api/client';

const MIN_LENGTH = 10;

/**
 * Eigenes Passwort ändern.
 *
 * Vorher gab es dafür keinen Weg: Ein einmal vergebenes Passwort ließ sich
 * nicht mehr wechseln, weil `ADMIN_PASSWORD` nur bei der Ersteinrichtung
 * gelesen wird. Wurde es bekannt, blieb es gültig.
 */
export function AdminPasswordChange() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  function fail(message: string) {
    setIsError(true);
    setStatus(message);
  }

  async function submit() {
    if (!current || !next) {
      fail('Bitte bisheriges und neues Passwort eingeben.');
      return;
    }
    if (next.length < MIN_LENGTH) {
      fail(`Das neue Passwort muss mindestens ${MIN_LENGTH} Zeichen lang sein.`);
      return;
    }
    if (next !== repeat) {
      fail('Die beiden neuen Passwörter stimmen nicht überein.');
      return;
    }

    setIsBusy(true);
    setIsError(false);
    setStatus('Wird geändert …');

    try {
      await adminChangePassword(current, next);
      setCurrent('');
      setNext('');
      setRepeat('');
      setIsError(false);
      setStatus('Passwort geändert. Andere Geräte wurden abgemeldet.');
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Passwort konnte nicht geändert werden.');
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900';

  return (
    <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-1 text-lg font-semibold">Passwort ändern</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        Gilt für die Anmeldung am Adminbereich. Nach dem Ändern bleibst du hier angemeldet;
        alle anderen Geräte werden abgemeldet.
      </p>

      <div className="grid max-w-md gap-3">
        <div>
          <label htmlFor="pw-current" className="block text-sm font-medium">
            Bisheriges Passwort
          </label>
          <input
            id="pw-current"
            type="password"
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pw-new" className="block text-sm font-medium">
            Neues Passwort
          </label>
          <input
            id="pw-new"
            type="password"
            value={next}
            autoComplete="new-password"
            aria-describedby="pw-new-hinweis"
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <p id="pw-new-hinweis" className="mt-1 text-xs text-gray-500">
            Mindestens {MIN_LENGTH} Zeichen.
          </p>
        </div>

        <div>
          <label htmlFor="pw-repeat" className="block text-sm font-medium">
            Neues Passwort wiederholen
          </label>
          <input
            id="pw-repeat"
            type="password"
            value={repeat}
            autoComplete="new-password"
            onChange={(e) => setRepeat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={isBusy}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Passwort ändern
      </button>

      {status && (
        <p className={`mt-3 text-sm ${isError ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
