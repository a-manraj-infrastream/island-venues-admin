import { errorMessageOf, isBooking, isVenue } from '@/api/guards';
import type { Booking, BookingDecision, NewVenue, Venue } from '@/api/types';

/**
 * Error raised for any failed admin API call. `status` is 0 when the request
 * never produced an HTTP response (offline, or an expired IAP session whose
 * redirect to the Google sign-in page is blocked as a cross-origin fetch).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function fallbackMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'You are not signed in as venue staff. Reload the page to sign in again.';
  }
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'The server had a problem. Please try again.';
  return `Request failed (HTTP ${status}).`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/*
 * All calls are same-origin and relative (`/api/admin/...`): the load balancer
 * routes the prefix to island-venues-api and IAP authenticates the staff member
 * with its own cookie, so the browser never holds a token. `credentials:
 * 'same-origin'` is the fetch default; it is spelled out because the IAP cookie
 * is the only thing that makes these calls work.
 */
async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      // X-Requested-With makes IAP answer an expired session with 401 instead
      // of a 302 to the Google sign-in page, which fetch cannot follow across
      // origins; the 401 then shows the "reload to sign in" message.
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection, then reload the page.');
  }
  const body = await readJson(response);
  if (!response.ok) {
    throw new ApiError(response.status, errorMessageOf(body) ?? fallbackMessage(response.status));
  }
  return body;
}

export async function listBookings(): Promise<Booking[]> {
  const body = await request('/api/admin/bookings');
  // Accept both a bare array and `{bookings: [...]}` so a cosmetic envelope
  // change in the API does not blank the staff console.
  const items: unknown =
    Array.isArray(body) ? body : (body as { bookings?: unknown } | undefined)?.bookings;
  if (!Array.isArray(items) || !items.every(isBooking)) {
    throw new ApiError(200, 'The server returned bookings in an unexpected format.');
  }
  return items;
}

/**
 * Approves or rejects one booking. Returns the server's updated booking when it
 * sends one back, or `undefined` when the response has no (recognisable) body;
 * the caller then keeps its optimistic state.
 */
export async function decideBooking(id: string, decision: BookingDecision): Promise<Booking | undefined> {
  const body = await request(`/api/admin/bookings/${encodeURIComponent(id)}/${decision}`, { method: 'POST' });
  return isBooking(body) ? body : undefined;
}

export async function createVenue(venue: NewVenue): Promise<Venue> {
  const body = await request('/api/admin/venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venue),
  });
  if (!isVenue(body)) {
    throw new ApiError(200, 'The venue was sent, but the server reply was not a venue. Reload to check.');
  }
  return body;
}
