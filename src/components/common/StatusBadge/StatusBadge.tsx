import type { BookingStatus } from '@/api';
import styles from './StatusBadge.module.css';

interface Props {
  status: BookingStatus;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
};

const STATUS_CLASS: Record<BookingStatus, string | undefined> = {
  PENDING: styles.pending,
  APPROVED: styles.approved,
  REJECTED: styles.rejected,
  CANCELLED: styles.cancelled,
  PAID: styles.paid,
};

/** Status pill. The label is text, so colour is never the only signal. */
export function StatusBadge({ status }: Props) {
  return <span className={`${styles.badge} ${STATUS_CLASS[status] ?? ''}`}>{STATUS_LABELS[status]}</span>;
}
