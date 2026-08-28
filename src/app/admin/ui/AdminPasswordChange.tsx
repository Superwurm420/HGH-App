'use client';

import { useState } from 'react';

import { adminChangePassword } from '@/lib/api/client';

interface AdminPasswordChangeProps {
  /**
   * Erstvergabe nach der Ersteinrichtung: Es gibt noch kein bisheriges
   * Passwort, das Feld dafür entfällt.
   */
  initial?: boolean;
  /** Wird nach erfolgreichem Setzen aufgerufen. */
  onDone?: () => void;
}

/**
 * Eigenes Passwort setzen — Erstvergabe wie späterer Wechsel.
 *
 * Eine Mindestlänge gibt es bewusst nicht; die Länge bestimmt die Redaktion.
 * Geprüft wird hier nur, was die Eingabe selbst betrifft: nicht leer und
 * zweimal gleich getippt. Alles Weitere entscheidet der Server.
 */
export function AdminPasswordChange({ initial = false, onDone }: AdminPasswordChangeProps) {
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
    if (!initial && !current) {
      fail('Bitte das bisherige Passwort eingeben.');
      return;
    }
    if (!next) {
      fail('Bitte ein neues Passwort eingeben.');
      return;
    }
    if (next !== repeat) {
      fail('Die beiden neuen Passwörter stimmen nicht überein.');
      return;
    }

    setIsBusy(true);
    setIsError(false);
    setStatus(initial ? 'Wird gesetzt …' : 'Wird geändert …');

    try {
      await adminChangePassword(initial ? '' : current, next);
      setCurrent('');
      setNext('');
      setRepeat('');
      setIsError(false);
      setStatus(
        initial
          ? 'Passwort gesetzt. Ab jetzt ist die Anmeldung nur noch damit möglich.'
          : 'Passwort geändert. Andere Geräte wurden abgemeldet.',
      );
      onDone?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Passwort konnte nicht gesetzt werden.');
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900';

  return (
    <div className="rounded-lg border border-gray-300 p-4 dark:border-gray-700">
      <h2 className="mb-1 text-lg font-semibold">
        {initial ? 'Passwort vergeben' : 'Passwort ändern'}
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {initial
          ? 'Ersetzt das Standardpasswort und gilt ab sofort für die Anmeldung am Adminbereich. Es gibt keine Vorgabe zur Länge — wähle etwas, das nicht zu erraten ist.'
          : 'Gilt für die Anmeldung am Adminbereich. Nach dem Ändern bleibst du hier angemeldet; alle anderen Geräte werden abgemeldet.'}
      </p>

      <div className="grid max-w-md gap-3">
        {!initial && (
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
        )}

        <div>
          <label htmlFor="pw-new" className="block text-sm font-medium">
            {initial ? 'Passwort' : 'Neues Passwort'}
          </label>
          <input
            id="pw-new"
            type="password"
            value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pw-repeat" className="block text-sm font-medium">
            {initial ? 'Passwort wiederholen' : 'Neues Passwort wiederholen'}
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
        {initial ? 'Passwort speichern' : 'Passwort ändern'}
      </button>

      {status && (
        <p className={`mt-3 text-sm ${isError ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
