import { BOOKING_STATUSES, type Booking, type BookingStatus, type Venue } from '@/api/types';

/*
 * Runtime guards for the fetch boundary. `response.json()` is untyped data from
 * the network; checking it here means a contract drift in the API shows up as
 * a clear error instead of `undefined` rendering deep inside the table.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.venueId === 'string' &&
    typeof value.venueName === 'string' &&
    typeof value.date === 'string' &&
    typeof value.guests === 'number' &&
    typeof value.owner === 'string' &&
    typeof value.contactEmail === 'string' &&
    isBookingStatus(value.status) &&
    typeof value.createdAt === 'string'
  );
}

export function isVenue(value: unknown): value is Venue {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.town === 'string' &&
    typeof value.capacity === 'number' &&
    typeof value.pricePerDayMur === 'number' &&
    typeof value.description === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string')
  );
}

/** Extracts `{"error": "..."}` from an API error body, if that is what it is. */
export function errorMessageOf(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.error === 'string' && value.error.trim() !== '') {
    return value.error;
  }
  return undefined;
}
