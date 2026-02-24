import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="logo-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/content/branding/school-logo.svg" alt="HGH Logo" width={44} height={44} />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Holztechnik und Gestaltung</div>
          <div className="text-xs text-muted">Hildesheim</div>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
