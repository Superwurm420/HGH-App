import { type ReactNode } from 'react';

/**
 * Formatiert ein Fach mit Zero-Width-Space nach '/' für saubere Zeilenumbrüche.
 */
export function formatSubject(subject: string, partClassName?: string): ReactNode {
  return subject.split('/').map((part, i, arr) => (
    <span key={i} className={partClassName}>
      {part}{i < arr.length - 1 && <>{'/\u200B'}</>}
    </span>
  ));
}
