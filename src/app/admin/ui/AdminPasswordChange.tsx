'use client';

import { useState } from 'react';

import { adminChangePassword } from '@/lib/api/client';
import { Card, Field, TextInput, adminStyles as styles } from './parts';

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

  return (
    <Card
      title={initial ? 'Passwort vergeben' : 'Passwort ändern'}
      hint={
        initial
          ? 'Ersetzt das Standardpasswort und gilt ab sofort für die Anmeldung am Adminbereich. Es gibt keine Vorgabe zur Länge — wähle etwas, das nicht zu erraten ist.'
          : 'Gilt für die Anmeldung am Adminbereich. Nach dem Ändern bleibst du hier angemeldet; alle anderen Geräte werden abgemeldet.'
      }
    >
      <div className={styles.stack} style={{ maxWidth: '26rem' }}>
        {!initial && (
          <Field label="Bisheriges Passwort">
            <TextInput
              type="password"
              value={current}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
        )}

        <Field label={initial ? 'Passwort' : 'Neues Passwort'}>
          <TextInput
            type="password"
            value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>

        <Field label={initial ? 'Passwort wiederholen' : 'Neues Passwort wiederholen'}>
          <TextInput
            type="password"
            value={repeat}
            autoComplete="new-password"
            onChange={(e) => setRepeat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          />
        </Field>

        <div className={styles.row}>
          <button type="button" onClick={submit} disabled={isBusy} className="btn">
            {initial ? 'Passwort speichern' : 'Passwort ändern'}
          </button>
          {status && (
            <p className={styles.status} data-tone={isError ? 'error' : undefined}>
              {status}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
