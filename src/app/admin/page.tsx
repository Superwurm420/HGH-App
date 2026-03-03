import { Metadata } from 'next';
import { AdminWorkspace } from './ui/AdminWorkspace';

export const metadata: Metadata = {
  title: 'Admin · Terminverwaltung',
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-semibold">Adminbereich: Terminverwaltung</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        Neue Termine können direkt erstellt, bearbeitet und gelöscht werden. Der Fokus liegt auf einem einfachen Ablauf ohne TXT-Upload.
      </p>
      <AdminWorkspace />
    </main>
  );
}
