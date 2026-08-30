import { describe, expect, it } from 'vitest';

import { MESSAGE_MAX, validateFeedback } from './feedback';

/**
 * `POST /api/feedback` ist der einzige Schreibzugriff ohne Anmeldung. Was hier
 * durchgeht, landet ungeprüft in der Datenbank — deshalb die Prüfung als
 * eigene, reine Funktion.
 */
describe('validateFeedback', () => {
  it('nimmt eine einfache Rückmeldung an', () => {
    const result = validateFeedback({ message: '  Der Plan fehlt.  ', category: 'bug' });

    expect(result).toEqual({
      ok: true,
      value: { message: 'Der Plan fehlt.', category: 'bug', contact: '', klasse: '', page: '' },
    });
  });

  it('lehnt eine leere Nachricht ab', () => {
    expect(validateFeedback({ message: '   ' })).toEqual({
      ok: false,
      error: 'Bitte schreib etwas in das Feld.',
    });
  });

  it('lehnt eine zu lange Nachricht ab', () => {
    const result = validateFeedback({ message: 'x'.repeat(MESSAGE_MAX + 1) });

    expect(result.ok).toBe(false);
  });

  it('fällt ohne Angabe auf "other" zurück', () => {
    const result = validateFeedback({ message: 'Hallo' });

    expect(result.ok && result.value.category).toBe('other');
  });

  // Die Spalte hat einen CHECK-Constraint: ein unbekannter Wert käme sonst als
  // SQL-Fehler zurück statt als lesbare Meldung.
  it('lehnt eine unbekannte Kategorie ab', () => {
    expect(validateFeedback({ message: 'Hallo', category: 'spam' })).toEqual({
      ok: false,
      error: 'Unbekannte Kategorie.',
    });
  });

  it('normalisiert die Klasse und kürzt die Seite', () => {
    const result = validateFeedback({
      message: 'Hallo',
      klasse: ' ht11 ',
      page: `/${'a'.repeat(500)}`,
    });

    expect(result.ok && result.value.klasse).toBe('HT11');
    expect(result.ok && result.value.page.length).toBe(200);
  });
});
