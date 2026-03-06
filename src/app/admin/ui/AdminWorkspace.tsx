'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminAnnouncementEditor } from './AdminAnnouncementEditor';
import { AdminUploadManager } from './AdminUploadManager';
import { AdminEventEditor } from './AdminEventEditor';
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
} from '@/lib/api/client';

type Tab = 'uploads' | 'announcements' | 'events';

export function AdminWorkspace() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [status, setStatus] = useState('Bitte anmelden.');
  const [activeTab, setActiveTab] = useState<Tab>('uploads');

  const doCheckSession = useCallback(async () => {
    try {
      const res = await checkAdminSession();
      setIsAuthenticated(res.authenticated);
      if (res.authenticated) setStatus('Angemeldet.');
    } catch {
      setStatus('Fehler beim Laden der Admin-Sitzung.');
    }
  }, []);

  useEffect(() => {
    doCheckSession();
  }, [doCheckSession]);

  async function login() {
    setIsLoginPending(true);
    try {
      await adminLogin(username, password);
      setUsername('');
      setPassword('');
      setIsAuthenticated(true);
      setStatus('Anmeldung erfolgreich.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    try {
      await adminLogout();
    } catch { /* ignore */ }
    setIsAuthenticated(false);
    setStatus('Abgemeldet.');
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-md rounded-lg border border-gray-300 p-6 dark:border-gray-700">
        <h2 className="mb-2 text-lg font-semibold">Admin-Anmeldung</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Bitte Benutzername und Passwort eingeben, um den Adminbereich zu öffnen.
        </p>
        <label className="block text-sm font-medium">
          Benutzername
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-900"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } }}
          />
        </label>
        <button
          type="button"
          onClick={login}
          disabled={isLoginPending}
          className="mt-4 rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Anmelden
        </button>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Status: {status}</p>
      </section>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'uploads', label: 'Stundenplan' },
    { key: 'announcements', label: 'Ankündigungen' },
    { key: 'events', label: 'Termine' },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Abmelden
        </button>
      </div>

      {activeTab === 'uploads' && <AdminUploadManager />}
      {activeTab === 'announcements' && <AdminAnnouncementEditor />}
      {activeTab === 'events' && <AdminEventEditor />}
    </section>
  );
}
