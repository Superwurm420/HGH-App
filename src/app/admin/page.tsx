import { Metadata } from 'next';
import { AdminAnnouncementEditor } from './ui/AdminAnnouncementEditor';

export const metadata: Metadata = {
  title: 'Admin · Pinnwand-Editor',
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-semibold">Adminbereich: Pinnwand-Editor</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        Hier können Pinnwand-TXT-Dateien im bestehenden Format erstellt, geprüft, importiert und gespeichert werden.
      </p>
      <AdminAnnouncementEditor />
    </main>
  );
}
