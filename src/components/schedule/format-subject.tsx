import { type ReactNode } from 'react';

/** Bis zu dieser Länge bleibt ein Teilfach zusammen — darüber darf es umbrechen. */
const KEEP_TOGETHER_MAX = 12;

/**
 * Formatiert ein Fach so, dass es bevorzugt am '/' umbricht.
 *
 * Fächer stehen im Plan oft als „Politik/Deutsch" oder „WuG/Technik". In den
 * schmalen Spalten der Wochen- und TV-Ansicht bricht so etwas sonst mitten im
 * Wort um. Deshalb:
 *
 * - Nach jedem '/' steht ein Zero-Width-Space: dort darf umgebrochen werden.
 * - Kurze Teile bekommen `white-space: nowrap` und bleiben ganz — der Umbruch
 *   landet am Schrägstrich statt irgendwo im Wort.
 * - Lange Teile (länger als {@link KEEP_TOGETHER_MAX}) dürfen weiter intern
 *   umbrechen, sonst liefe die Zelle über.
 */
export function formatSubject(subject: string, partClassName?: string): ReactNode {
  const parts = subject.split('/');

  return parts.map((part, i) => {
    const isLast = i === parts.length - 1;
    const keepTogether = part.trim().length <= KEEP_TOGETHER_MAX;

    return (
      <span key={i} className={partClassName}>
        {/* Der Schrägstrich steht außerhalb des nowrap-Teils, sonst würde
            `white-space: nowrap` auch die Umbruchstelle dahinter schlucken. */}
        <span style={keepTogether ? { whiteSpace: 'nowrap' } : undefined}>{part}</span>
        {!isLast && '/\u200B'}
      </span>
    );
  });
}
