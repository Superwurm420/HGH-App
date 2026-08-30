'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { AdminContentEditor } from './AdminContentEditor';
import { AdminUploadManager } from './AdminUploadManager';
import { AdminMediaManager } from './AdminMediaManager';
import { AdminSettingsEditor } from './AdminSettingsEditor';
import { AdminPasswordChange } from './AdminPasswordChange';
import { Card, Field, Notice, Segmented, Status, TextInput, adminStyles as styles } from './parts';
import { DEFAULT_ADMIN_PASSWORD } from '@/lib/admin-defaults';
import {
  getAdminAuthenticated,
  serverAdminAuthenticated,
  setAdminAuthenticated,
  subscribeAdminAuth,
} from '@/lib/storage/admin-session';
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
  checkSetupStatus,
  type SetupStatus,
} from '@/lib/api/client';

type Tab = 'uploads' | 'content' | 'media' | 'settings';

const TABS: { value: Tab; label: string }[] = [
  { value: 'uploads', label: 'Stundenplan' },
  { value: 'content', label: 'Ankündigungen & Termine' },
  { value: 'media', label: 'Bilder' },
  { value: 'settings', label: 'Einstellungen' },
];

/**
 * Erklärt, warum eine Anmeldung gerade nicht klappen kann.
 * Ohne diese Hinweise bleibt bei fehlender Migration nur „Ungültige Anmeldedaten".
 */
function SetupHints({ setupStatus, apiReachable }: { setupStatus: SetupStatus | null; apiReachable: boolean }) {
  const hints: { message: string; detail: string }[] = [];

  if (!apiReachable) {
    hints.push({
      message: 'Die App erreicht ihre eigene Schnittstelle nicht.',
      detail: 'Läuft der Server? Lokal wird er mit "npm run dev" gestartet.',
    });
  } else if (setupStatus) {
    if (!setupStatus.dbReady) {
      hints.push({
        message: 'Die Datenbank ist noch nicht eingerichtet.',
        detail: 'Lokal: "npm run db:migrate:local". Auf Cloudflare: "npm run db:migrate".',
      });
    }
    if (setupStatus.dbReady && !setupStatus.hasUsers) {
      hints.push({
        message: 'Ersteinrichtung: Es gibt noch kein Admin-Konto.',
        detail: `Benutzername "${setupStatus.adminUser}", Passwort "${DEFAULT_ADMIN_PASSWORD}". Das Konto wird dabei angelegt, und du vergibst direkt danach ein eigenes Passwort.`,
      });
    }
    if (setupStatus.dbReady && setupStatus.needsPassword) {
      hints.push({
        message: 'Für das Admin-Konto gilt noch das Standardpasswort.',
        detail: `Melde dich mit "${setupStatus.adminUser}" und "${DEFAULT_ADMIN_PASSWORD}" an und vergib ein eigenes Passwort. Bis dahin kommt jede und jeder hinein, der die Adresse kennt.`,
      });
    }
  }

  if (hints.length === 0) return null;

  return (
    <div className={`${styles.stack} mb-4`}>
      {hints.map((hint) => (
        <Notice key={hint.message} title={hint.message}>
          {hint.detail}
        </Notice>
      ))}
    </div>
  );
}

export function AdminWorkspace() {
  // Der Anmeldezustand liegt außerhalb dieser Komponente, weil der
  // Abmelden-Knopf in der Kopfzeile sitzt (siehe lib/storage/admin-session).
  const isAuthenticated = useSyncExternalStore(
    subscribeAdminAuth,
    getAdminAuthenticated,
    serverAdminAuthenticated,
  );
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('uploads');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [apiReachable, setApiReachable] = useState(true);

  const fetchSetupStatus = useCallback(async () => {
    try {
      setSetupStatus(await checkSetupStatus());
      setApiReachable(true);
    } catch {
      setApiReachable(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await checkAdminSession();
      setApiReachable(true);
      setAdminAuthenticated(res.authenticated);
      setMustSetPassword(res.mustSetPassword === true);
      if (!res.authenticated) {
        await fetchSetupStatus();
      }
    } catch {
      await fetchSetupStatus();
    } finally {
      setIsReady(true);
    }
  }, [fetchSetupStatus]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Abgemeldet wird in der Kopfzeile — hier muss danach nur der eigene
  // Zustand nachgezogen werden.
  useEffect(() => {
    if (isAuthenticated || !isReady) return;
    setMustSetPassword(false);
    fetchSetupStatus();
  }, [isAuthenticated, isReady, fetchSetupStatus]);

  async function login() {
    setIsLoginPending(true);
    try {
      const res = await adminLogin(username, password);
      setUsername('');
      setPassword('');
      setAdminAuthenticated(true);
      setMustSetPassword(res.mustSetPassword === true);
      setSetupStatus(null);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.');
      await fetchSetupStatus();
    } finally {
      setIsLoginPending(false);
    }
  }

  async function logout() {
    try {
      await adminLogout();
    } catch {
      // Auch wenn der Server nicht antwortet: lokal abmelden.
    }
    setAdminAuthenticated(false);
    setStatus('Abgemeldet.');
  }

  if (!isReady) {
    return <p className={styles.status}>Wird geladen …</p>;
  }

  if (!isAuthenticated) {
    // Solange kein eigenes Passwort vergeben ist, gilt noch das
    // Standardpasswort — dann darf die Seite es auch nennen.
    const isSetup =
      setupStatus?.dbReady === true && (!setupStatus.hasUsers || setupStatus.needsPassword);

    return (
      <section className="mx-auto max-w-md">
        <SetupHints setupStatus={setupStatus} apiReachable={apiReachable} />
        <Card
          title="Anmeldung"
          hint={
            isSetup
              ? `Ersteinrichtung: Benutzername "${setupStatus?.adminUser}", Passwort "${DEFAULT_ADMIN_PASSWORD}". Ein eigenes Passwort vergibst du im nächsten Schritt.`
              : 'Bitte Benutzername und Passwort eingeben.'
          }
        >
          <div className={styles.stack}>
            <Field label="Benutzername">
              <TextInput
                type="text"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="Passwort">
              <TextInput
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } }}
              />
            </Field>
            <div className={styles.row}>
              <button type="button" onClick={login} disabled={isLoginPending} className="btn">
                {isLoginPending ? 'Wird geprüft …' : 'Anmelden'}
              </button>
              <Status text={status} />
            </div>
          </div>
        </Card>
      </section>
    );
  }

  // Angemeldet, aber ohne Passwort: Der Adminbereich bleibt zu, bis eines
  // gesetzt ist. Der Server sperrt hier ohnehin alles außer der Passwort-Route
  // (siehe withAdmin) — die Tabs jetzt schon auszublenden erspart der
  // Redaktion nur eine Reihe von Fehlermeldungen.
  if (mustSetPassword) {
    return (
      <section className={`${styles.stack} mx-auto max-w-md`}>
        <Notice title="Bitte vergib jetzt ein Passwort.">
          Bis dahin gilt das Standardpasswort &bdquo;{DEFAULT_ADMIN_PASSWORD}&ldquo; — das steht
          in der Anleitung und ist damit allgemein bekannt. Der Adminbereich bleibt
          gesperrt, solange kein eigenes Passwort gesetzt ist.
        </Notice>

        <AdminPasswordChange initial onDone={() => setMustSetPassword(false)} />

        <div>
          <button type="button" onClick={logout} className="btn secondary">
            Abmelden
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.stack}>
      <Segmented<Tab> label="Bereiche" value={activeTab} options={TABS} onChange={setActiveTab} />

      {activeTab === 'uploads' && <AdminUploadManager />}
      {activeTab === 'content' && <AdminContentEditor />}
      {activeTab === 'media' && <AdminMediaManager />}
      {activeTab === 'settings' && <AdminSettingsEditor />}
    </section>
  );
}
