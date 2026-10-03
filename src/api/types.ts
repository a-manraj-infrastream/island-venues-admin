/**
 * Wire shapes of the island-venues-api admin endpoints (see the shared HTTP
 * contract). Kept in one place so the fetch boundary and the UI agree.
 */
export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PAID'] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  date: string;
  guests: number;
  owner: string;
  contactEmail: string;
  status: BookingStatus;
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  town: string;
  capacity: number;
  pricePerDayMur: number;
  description: string;
  tags: string[];
}

/** Body of POST /api/admin/venues: a venue without its server-assigned id. */
export type NewVenue = Omit<Venue, 'id'>;

/** Staff decisions exposed by the API, one path segment each. */
export type BookingDecision = 'approve' | 'reject';
