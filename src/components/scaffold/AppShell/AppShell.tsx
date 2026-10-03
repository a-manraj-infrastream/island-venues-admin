import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

interface Props {
  children: ReactNode;
}

/** Page frame: top bar with the product name, then the main content. */
export function AppShell({ children }: Props) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <h1 className={styles.title}>
            Island Venues <span className={styles.separator}>·</span> <span className={styles.staff}>Staff</span>
          </h1>
        </div>
        <p className={styles.tagline}>Event venues across Mauritius</p>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
