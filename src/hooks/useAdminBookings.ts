import { useCallback, useEffect, useState } from 'react';
import { ApiError, decideBooking, listBookings } from '@/api';
import type { Booking, BookingDecision, BookingStatus } from '@/api';

const TARGET_STATUS: Record<BookingDecision, BookingStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
};

const PAST_TENSE: Record<BookingDecision, string> = {
  approve: 'approved',
  reject: 'rejected',
};

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

export interface Feedback {
  tone: 'success' | 'error';
  message: string;
}

export interface AdminBookings {
  bookings: Booking[];
  load: LoadState;
  /** Ids of bookings with an approve/reject request in flight. */
  pendingIds: ReadonlySet<string>;
  feedback: Feedback | undefined;
  decide: (id: string, decision: BookingDecision) => Promise<void>;
  reload: () => void;
  dismissFeedback: () => void;
}

function messageOf(error: unknown): string {
  const message = error instanceof ApiError ? error.message.trim() : 'Something went wrong.';
  // Server messages are often bare phrases ("booking not found"); end them as
  // a sentence so the composed feedback below reads correctly.
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

/**
 * Loads every booking for staff and applies approve/reject decisions
 * optimistically: the row changes status immediately, and only that row is
 * rolled back if the server refuses. Rolling back per row (instead of restoring
 * a snapshot of the whole list) keeps a second, concurrent decision on another
 * row from being undone by the first one's failure.
 */
export function useAdminBookings(): AdminBookings {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | undefined>(undefined);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    // A flag rather than AbortController: a stale response (after reload or
    // unmount) is simply ignored, which is all this screen needs.
    // The 'loading' state is set by the initial useState and by reload(),
    // not here: setting state synchronously in an effect body causes a
    // cascading render (react-hooks/set-state-in-effect, enforced in CI).
    let current = true;
    listBookings().then(
      (items) => {
        if (!current) return;
        setBookings(items);
        setLoad({ kind: 'ready' });
      },
      (error: unknown) => {
        if (!current) return;
        setLoad({ kind: 'error', message: messageOf(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [generation]);

  const reload = useCallback(() => {
    setFeedback(undefined);
    setLoad({ kind: 'loading' });
    setGeneration((value) => value + 1);
  }, []);

  const dismissFeedback = useCallback(() => setFeedback(undefined), []);

  const decide = useCallback(
    async (id: string, decision: BookingDecision) => {
      const original = bookings.find((booking) => booking.id === id);
      // Only PENDING bookings can be decided, and one request per row at a time.
      if (!original || original.status !== 'PENDING' || pendingIds.has(id)) return;

      const target = TARGET_STATUS[decision];
      const label = `${original.venueName} on ${original.date}`;

      setBookings((list) => list.map((b) => (b.id === id ? { ...b, status: target } : b)));
      setPendingIds((ids) => new Set(ids).add(id));
      setFeedback(undefined);

      try {
        const updated = await decideBooking(id, decision);
        if (updated) {
          setBookings((list) => list.map((b) => (b.id === id ? updated : b)));
        }
        setFeedback({ tone: 'success', message: `Booking for ${label} ${PAST_TENSE[decision]}.` });
      } catch (error: unknown) {
        // Restore the status this row had before the click, but only if nothing
        // else (e.g. a reload) has replaced it since.
        setBookings((list) =>
          list.map((b) => (b.id === id && b.status === target ? { ...b, status: original.status } : b)),
        );
        setFeedback({
          tone: 'error',
          message: `Could not ${decision} the booking for ${label}: ${messageOf(error)} The change was undone.`,
        });
      } finally {
        setPendingIds((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
      }
    },
    [bookings, pendingIds],
  );

  return { bookings, load, pendingIds, feedback, decide, reload, dismissFeedback };
}
