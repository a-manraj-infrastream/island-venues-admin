import { useCallback, useMemo, useState } from 'react';
import type { BookingDecision } from '@/api';
import { BookingsTable } from '@/components/bookings/BookingsTable';
import { StatusFilter, type StatusFilterValue } from '@/components/bookings/StatusFilter';
import { STATUS_LABELS } from '@/components/common/StatusBadge';
import { useAdminBookings } from '@/hooks/useAdminBookings';
import styles from './BookingsPanel.module.css';

/** All bookings, filterable by status, with approve / reject on pending rows. */
export function BookingsPanel() {
  const { bookings, load, pendingIds, feedback, decide, reload, dismissFeedback } = useAdminBookings();
  const [filter, setFilter] = useState<StatusFilterValue>('ALL');

  const visible = useMemo(
    () => (filter === 'ALL' ? bookings : bookings.filter((booking) => booking.status === filter)),
    [bookings, filter],
  );

  const handleDecide = useCallback(
    (id: string, decision: BookingDecision) => {
      void decide(id, decision);
    },
    [decide],
  );

  return (
    <section className={styles.panel} aria-labelledby="bookings-heading">
      <header className={styles.header}>
        <div>
          <h2 id="bookings-heading" className={styles.title}>
            Bookings
          </h2>
          <p className={styles.subtitle}>Review requests from guests. Only pending bookings can be decided.</p>
        </div>
        <div className={styles.tools}>
          <StatusFilter value={filter} bookings={bookings} onChange={setFilter} />
          <button type="button" className={styles.refresh} onClick={reload} disabled={load.kind === 'loading'}>
            Refresh
          </button>
        </div>
      </header>

      {/* Polite live region for confirmations; failures use role="alert". */}
      <div aria-live="polite" className={styles.feedbackSlot}>
        {feedback?.tone === 'success' && (
          <p className={`${styles.feedback} ${styles.success}`}>
            {feedback.message}
            <button type="button" className={styles.dismiss} onClick={dismissFeedback}>
              Dismiss
            </button>
          </p>
        )}
      </div>
      {feedback?.tone === 'error' && (
        <p role="alert" className={`${styles.feedback} ${styles.error}`}>
          {feedback.message}
          <button type="button" className={styles.dismiss} onClick={dismissFeedback}>
            Dismiss
          </button>
        </p>
      )}

      {load.kind === 'loading' && (
        <p className={styles.state} role="status">
          Loading bookings…
        </p>
      )}

      {load.kind === 'error' && (
        <div role="alert" className={`${styles.feedback} ${styles.error}`}>
          <p className={styles.errorText}>Could not load bookings. {load.message}</p>
          <button type="button" className={styles.dismiss} onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {load.kind === 'ready' && visible.length === 0 && (
        <p className={styles.state}>
          {filter === 'ALL'
            ? 'No bookings yet.'
            : `No ${STATUS_LABELS[filter].toLowerCase()} bookings.`}
        </p>
      )}

      {load.kind === 'ready' && visible.length > 0 && (
        <>
          <p className={styles.count} role="status">
            Showing {visible.length} of {bookings.length} bookings
          </p>
          <BookingsTable bookings={visible} pendingIds={pendingIds} onDecide={handleDecide} />
        </>
      )}
    </section>
  );
}
