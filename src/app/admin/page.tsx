import { Metadata } from 'next';
import { AdminWorkspace } from './ui/AdminWorkspace';

export const metadata: Metadata = {
  title: 'Admin · HGH-App',
};

export default function AdminPage() {
  return (
    // Kein <main>: Das Grundgerüst in layout.tsx setzt bereits eines, und zwei
    // ineinander sind ungültig.
    <div className="mx-auto w-full max-w-6xl py-2 md:py-6">
      <h1 className="mb-2 text-2xl font-semibold">Adminbereich</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        Stundenplan hochladen, Ankündigungen und Termine verwalten, Einstellungen pflegen.
      </p>
      <AdminWorkspace />
    </div>
  );
}
