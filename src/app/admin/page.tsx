import { Metadata } from 'next';
import { AdminWorkspace } from './ui/AdminWorkspace';

export const metadata: Metadata = {
  title: 'Admin · HGH-App',
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-semibold">Adminbereich</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        Stundenplan hochladen, Ankündigungen und Termine verwalten, Einstellungen pflegen.
      </p>
      <AdminWorkspace />
    </main>
  );
}
