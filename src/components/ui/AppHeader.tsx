import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader() {
  return (
    <header className="card mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link className="btn-secondary" href="/">
          Heute
        </Link>
        <Link className="btn-secondary" href="/stundenplan">
          Wochenplan
        </Link>
        <Link className="btn-secondary" href="/einstellungen">
          Einstellungen
        </Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
