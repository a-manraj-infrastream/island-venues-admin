import type { Booking } from '@/api';

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b-1',
    venueId: 'v-le-morne',
    venueName: 'Le Morne Beach Pavilion',
    date: '2026-12-12',
    guests: 80,
    owner: 'guest@example.com',
    contactEmail: 'guest@example.com',
    status: 'PENDING',
    createdAt: '2026-10-01T09:00:00Z',
    ...overrides,
  };
}

export const BOOKINGS: Booking[] = [
  makeBooking({ id: 'b-1', venueName: 'Le Morne Beach Pavilion', date: '2026-12-12', status: 'PENDING' }),
  makeBooking({ id: 'b-2', venueName: 'Port Louis Waterfront Hall', date: '2026-11-20', status: 'APPROVED' }),
  makeBooking({ id: 'b-3', venueName: 'Chamarel Crater Terrace', date: '2026-11-28', status: 'REJECTED' }),
  makeBooking({ id: 'b-4', venueName: 'Grand Baie Sunset Deck', date: '2027-01-09', status: 'PENDING' }),
  makeBooking({ id: 'b-5', venueName: 'Blue Bay Lagoon Garden', date: '2026-12-31', status: 'PAID' }),
  makeBooking({ id: 'b-6', venueName: 'Curepipe Colonial House', date: '2026-10-30', status: 'CANCELLED' }),
];
