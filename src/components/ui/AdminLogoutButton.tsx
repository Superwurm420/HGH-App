'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { adminLogout } from '@/lib/api/client';
import {
  getAdminAuthenticated,
  serverAdminAuthenticated,
  setAdminAuthenticated,
  subscribeAdminAuth,
} from '@/lib/storage/admin-session';

/**
 * Abmelden — in der Kopfzeile neben der Umschaltung hell/dunkel.
 *
 * Erscheint nur im Adminbereich und nur, solange dort jemand angemeldet ist;
 * auf allen anderen Seiten gibt es nichts abzumelden.
 */
export function AdminLogoutButton() {
  const pathname = usePathname();
  const isAuthenticated = useSyncExternalStore(
    subscribeAdminAuth,
    getAdminAuthenticated,
    serverAdminAuthenticated,
  );

  if (!pathname?.startsWith('/admin') || !isAuthenticated) return null;

  async function logout() {
    try {
      await adminLogout();
    } catch {
      // Auch wenn der Server nicht antwortet: lokal abmelden.
    }
    setAdminAuthenticated(false);
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={logout}
      aria-label="Vom Adminbereich abmelden"
      title="Abmelden"
    >
      <span className="text-lg" aria-hidden="true">⏻</span>
    </button>
  );
}
