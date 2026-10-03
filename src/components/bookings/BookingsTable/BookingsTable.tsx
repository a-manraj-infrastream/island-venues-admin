import type { Booking, BookingDecision } from '@/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { VisuallyHidden } from '@/components/common/VisuallyHidden';
import styles from './BookingsTable.module.css';

interface Props {
  bookings: readonly Booking[];
  pendingIds: ReadonlySet<string>;
  onDecide: (id: string, decision: BookingDecision) => void;
}

/**
 * Presentational table of bookings. Decisions are only offered on PENDING
 * rows: APPROVED/REJECTED are final, CANCELLED is the guest's call and PAID
 * is set by the payment webhook.
 */
export function BookingsTable({ bookings, pendingIds, onDecide }: Props) {
  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          <VisuallyHidden>Bookings</VisuallyHidden>
        </caption>
        <thead>
          <tr>
            <th scope="col">Venue</th>
            <th scope="col">Date</th>
            <th scope="col" className={styles.numeric}>
              Guests
            </th>
            <th scope="col">Booked by</th>
            <th scope="col">Contact</th>
            <th scope="col">Status</th>
            <th scope="col">
              <VisuallyHidden>Actions</VisuallyHidden>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const busy = pendingIds.has(booking.id);
            // The accessible name says which row the button acts on; it starts
            // with the visible word so voice control ("click Approve") works.
            const target = `booking for ${booking.venueName} on ${booking.date}`;
            return (
              <tr key={booking.id} aria-busy={busy || undefined}>
                <th scope="row" className={styles.venue}>
                  {booking.venueName}
                </th>
                <td className={styles.nowrap}>{booking.date}</td>
                <td className={styles.numeric}>{booking.guests}</td>
                <td className={styles.email}>{booking.owner}</td>
                <td className={styles.email}>{booking.contactEmail}</td>
                <td>
                  <StatusBadge status={booking.status} />
                </td>
                <td className={styles.actions}>
                  {booking.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={busy}
                        onClick={() => onDecide(booking.id, 'approve')}
                        aria-label={`Approve ${target}`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={busy}
                        onClick={() => onDecide(booking.id, 'reject')}
                        aria-label={`Reject ${target}`}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {busy && <span className={styles.saving}>Saving…</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
