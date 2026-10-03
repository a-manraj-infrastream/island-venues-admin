import { useCallback, useId, type ChangeEvent } from 'react';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from '@/api';
import { STATUS_LABELS } from '@/components/common/StatusBadge';
import styles from './StatusFilter.module.css';

export type StatusFilterValue = BookingStatus | 'ALL';

interface Props {
  value: StatusFilterValue;
  bookings: readonly Booking[];
  onChange: (value: StatusFilterValue) => void;
}

function isFilterValue(value: string): value is StatusFilterValue {
  return value === 'ALL' || (BOOKING_STATUSES as readonly string[]).includes(value);
}

/** Status dropdown; each option shows how many bookings it would keep. */
export function StatusFilter({ value, bookings, onChange }: Props) {
  const id = useId();
  const countOf = (status: BookingStatus) => bookings.filter((b) => b.status === status).length;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (isFilterValue(event.target.value)) onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div className={styles.filter}>
      <label htmlFor={id} className={styles.label}>
        Filter by status
      </label>
      <select id={id} className={styles.select} value={value} onChange={handleChange}>
        <option value="ALL">All statuses ({bookings.length})</option>
        {BOOKING_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]} ({countOf(status)})
          </option>
        ))}
      </select>
    </div>
  );
}
