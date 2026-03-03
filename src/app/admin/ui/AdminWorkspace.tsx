'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminAnnouncementEditor } from './AdminAnnouncementEditor';
import { AdminFileManager } from './AdminFileManager';

export function AdminWorkspace() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [status, setStatus] = useState('Bitte anmelden.');

  const checkSession = useCallback(async () => {
    const response = await fetch('/api/admin/session', { cache: 'no-store' });
    if (!response.ok) return;

    const payload = (await response.json()) as { authenticated: boolean };
    setIsAuthenticated(payload.authenticated);
    if (payload.authenticated) {
      setStatus('Angemeldet.');
    }
  }, []);

  useEffect(() => {
    checkSession().catch(() => setStatus('Fehler beim Laden der Admin-Sitzung.'));
  }, [checkSession]);

  async function login() {
    setIsLoginPending(true);

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? 'Anmeldung fehlgeschlagen.');
      setIsLoginPending(false);
      return;
    }

    setPassword('');
    setIsAuthenticated(true);
    setStatus('Anmeldung erfolgreich.');
    setIsLoginPending(false);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setStatus('Abgemeldet.');
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-md rounded-lg border border-gray-300 p-6 dark:border-gray-700">
        <h2 className="mb-2 text-lg font-semibold">Admin-Anmeldung</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Bitte Passwort eingeben, um den Adminbereich zu öffnen.</p>
        <label className="block text-sm font-medium">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                login().catch(() => setStatus('Anmeldung fehlgeschlagen.'));
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => login().catch(() => setStatus('Anmeldung fehlgeschlagen.'))}
          disabled={isLoginPending}
          className="mt-4 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Anmelden
        </button>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Status: {status}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => logout().catch(() => setStatus('Abmelden fehlgeschlagen.'))} className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
          Abmelden
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
        <AdminAnnouncementEditor />
        <AdminFileManager />
      </div>
    </section>
  );
}
