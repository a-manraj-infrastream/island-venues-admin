import { http, HttpResponse } from 'msw';
import { BOOKINGS } from '@/test/mocks/fixtures';

// Baseline handlers; tests override with server.use() for error paths.
export const handlers = [
  http.get('/api/admin/bookings', () => HttpResponse.json(BOOKINGS)),
];
