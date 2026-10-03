import { http, HttpResponse } from 'msw';
import { ApiError, createVenue, decideBooking, listBookings } from '@/api';
import { BOOKINGS } from '@/test/mocks/fixtures';
import { server } from '@/test/mocks/server';

describe('admin API client', () => {
  it('accepts a bare array or a {bookings} envelope', async () => {
    expect(await listBookings()).toEqual(BOOKINGS);
    server.use(http.get('/api/admin/bookings', () => HttpResponse.json({ bookings: BOOKINGS })));
    expect(await listBookings()).toEqual(BOOKINGS);
  });

  it('asks IAP for a 401 instead of a sign-in redirect', async () => {
    let requestedWith: string | null = null;
    server.use(
      http.get('/api/admin/bookings', ({ request }) => {
        requestedWith = request.headers.get('x-requested-with');
        return HttpResponse.json({ error: 'authentication required' }, { status: 401 });
      }),
    );
    await expect(listBookings()).rejects.toMatchObject({ status: 401 });
    expect(requestedWith).toBe('XMLHttpRequest');
  });

  it('rejects bookings with an unknown status', async () => {
    server.use(http.get('/api/admin/bookings', () => HttpResponse.json([{ ...BOOKINGS[0], status: 'ON_HOLD' }])));
    await expect(listBookings()).rejects.toThrow('unexpected format');
  });

  it('surfaces {"error"} bodies with the HTTP status', async () => {
    server.use(
      http.post('/api/admin/bookings/:id/reject', () => HttpResponse.json({ error: 'not found' }, { status: 404 })),
    );
    const error = await decideBooking('nope', 'reject').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'not found' });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(http.post('/api/admin/venues', () => new HttpResponse('<html>oops</html>', { status: 502 })));
    await expect(
      createVenue({ name: 'n', town: 't', capacity: 1, pricePerDayMur: 1, description: 'd', tags: [] }),
    ).rejects.toMatchObject({ status: 502, message: 'The server had a problem. Please try again.' });
  });

  it('sends same-origin JSON for a new venue', async () => {
    let seen: { contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/admin/venues', async ({ request }) => {
        seen = { contentType: request.headers.get('content-type'), body: await request.json() };
        // The handler echoes the request; its JSON is an object by construction.
        return HttpResponse.json({ id: 'v1', ...(seen.body as object) }, { status: 201 });
      }),
    );
    const venue = await createVenue({
      name: 'Pamplemousses Garden Hall',
      town: 'Pamplemousses',
      capacity: 60,
      pricePerDayMur: 40000,
      description: 'Next to the botanical garden.',
      tags: ['garden'],
    });
    expect(venue.id).toBe('v1');
    expect(seen?.contentType).toBe('application/json');
    expect(seen?.body).toMatchObject({ town: 'Pamplemousses', capacity: 60 });
  });
});
