import { ThemeToggle } from './ThemeToggle';
import styles from './Topbar.module.css';

export function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.branding}>
        <div className={styles.logoBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logoImage} src="/content/branding/school-logo.svg" alt="HGH Logo" width={44} height={44} />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Holztechnik und Gestaltung</div>
          <div className={`text-xs ${styles.subtitle}`}>Hildesheim</div>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
