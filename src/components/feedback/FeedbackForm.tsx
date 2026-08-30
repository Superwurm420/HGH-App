'use client';

import { useState } from 'react';

import { submitFeedback } from '@/lib/api/client';
import { loadSelectedClass } from '@/lib/storage/preferences';
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS } from '@/lib/feedback';
import styles from './feedback.module.css';

/**
 * Rückmeldung an die Redaktion.
 *
 * Bewusst kurz gehalten: Ein Pflichtfeld, alles andere freiwillig. Wer etwas
 * melden will, tut das im Vorbeigehen — jede weitere Zeile im Formular kostet
 * Meldungen.
 */

const MESSAGE_MAX = 2000;

export function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('other');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function send() {
    if (!message.trim()) {
      setStatus('Bitte schreib etwas in das Feld.');
      return;
    }

    setIsPending(true);
    setStatus('');
    try {
      await submitFeedback({
        message,
        category,
        contact,
        // Die Klasse steht ohnehin im Browser — sie hier mitzuschicken erspart
        // die Rückfrage, wen eine Meldung zum Stundenplan betrifft.
        klasse: loadSelectedClass() ?? '',
        page: window.location.pathname,
      });
      setIsSent(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Senden fehlgeschlagen.');
    } finally {
      setIsPending(false);
    }
  }

  if (isSent) {
    return (
      <div className="card surface">
        <h2 className="section-title mb-3">Rückmeldung</h2>
        <p className="text-sm">Danke! Deine Rückmeldung ist angekommen.</p>
        <button
          type="button"
          className="btn secondary mt-3"
          onClick={() => {
            setIsSent(false);
            setMessage('');
            setContact('');
            setStatus('');
          }}
        >
          Noch etwas melden
        </button>
      </div>
    );
  }

  return (
    <div className="card surface">
      <h2 className="section-title mb-3">Rückmeldung</h2>
      <p className="text-xs text-muted mb-3">
        Fehler gefunden, etwas veraltet oder eine Idee? Schreib es hier hinein — es
        landet direkt bei der Redaktion. Ohne Kontaktangabe bleibt die Meldung anonym.
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-muted">Worum geht es?</span>
          <select
            className="select"
            style={{ marginTop: 4 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {FEEDBACK_CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>{FEEDBACK_CATEGORY_LABELS[entry]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted">Deine Rückmeldung</span>
          <textarea
            className={styles.textarea}
            rows={5}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Was ist dir aufgefallen?"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Name oder Kontakt (freiwillig)</span>
          <input
            type="text"
            className={styles.input}
            value={contact}
            maxLength={200}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Nur, wenn eine Antwort erwünscht ist"
          />
        </label>

        <div className="flex items-center gap-3">
          <button type="button" className="btn" onClick={send} disabled={isPending}>
            {isPending ? 'Wird gesendet …' : 'Absenden'}
          </button>
          {status && <p className={styles.error}>{status}</p>}
        </div>
      </div>
    </div>
  );
}
