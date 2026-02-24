import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="logo-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10L12 4l9 6" />
            <path d="M5 10v9h14v-9" />
            <path d="M9 19v-5h6v5" />
          </svg>
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
