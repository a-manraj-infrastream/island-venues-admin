import type { ReactNode } from 'react';
import styles from './VisuallyHidden.module.css';

interface Props {
  children: ReactNode;
}

/** Text for assistive technology only (e.g. which row a button acts on). */
export function VisuallyHidden({ children }: Props) {
  return <span className={styles.hidden}>{children}</span>;
}
