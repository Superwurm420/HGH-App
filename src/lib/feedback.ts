/**
 * Kategorien der Rückmeldungen.
 *
 * Liegt in `src/lib/`, weil drei Seiten dasselbe brauchen: die Prüfung im
 * Server, das Formular und der Adminbereich. Die beiden letzten sind
 * `'use client'` und dürfen nicht aus `src/server/` importieren — deshalb
 * hier und nicht im Service.
 */

export const FEEDBACK_CATEGORIES = ['bug', 'idea', 'timetable', 'content', 'other'] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Fehler',
  idea: 'Idee',
  timetable: 'Stundenplan',
  content: 'Inhalt',
  other: 'Sonstiges',
};

/** Beschriftung für einen Wert aus der Datenbank — auch für unbekannte. */
export function feedbackCategoryLabel(value: string): string {
  return FEEDBACK_CATEGORY_LABELS[value as FeedbackCategory] ?? value;
}
