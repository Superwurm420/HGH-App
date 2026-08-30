/**
 * Ob gerade jemand am Adminbereich angemeldet ist — im Browser, für die
 * Dauer der Seitenansicht.
 *
 * Nötig, weil der Abmelden-Knopf inzwischen in der Kopfzeile sitzt (neben der
 * Umschaltung hell/dunkel) und damit außerhalb von `AdminWorkspace` steht.
 * Beide brauchen denselben Zustand: Die Kopfzeile zeigt den Knopf nur, wenn
 * es etwas abzumelden gibt, und der Adminbereich muss auf ein Abmelden von
 * dort sofort reagieren.
 *
 * Bewusst nur im Speicher und ohne `localStorage`: Die Wahrheit steht im
 * Session-Cookie, das der Server prüft. Was hier steht, steuert allein die
 * Anzeige.
 */

let authenticated = false;
const listeners = new Set<() => void>();

export function setAdminAuthenticated(value: boolean): void {
  if (authenticated === value) return;
  authenticated = value;
  for (const listener of listeners) listener();
}

export function subscribeAdminAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAdminAuthenticated(): boolean {
  return authenticated;
}

/** Der Server weiß beim Rendern nichts davon — sonst gäbe es einen Hydration-Fehler. */
export function serverAdminAuthenticated(): boolean {
  return false;
}
