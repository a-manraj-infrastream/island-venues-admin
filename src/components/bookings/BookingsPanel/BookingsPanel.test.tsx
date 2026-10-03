import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { BookingsPanel } from '@/components/bookings/BookingsPanel';
import { deferred } from '@/test/deferred';
import { BOOKINGS } from '@/test/mocks/fixtures';
import { server } from '@/test/mocks/server';

const LE_MORNE = /Le Morne Beach Pavilion/;
const GRAND_BAIE = /Grand Baie Sunset Deck/;

async function renderLoaded() {
  const user = userEvent.setup();
  render(<BookingsPanel />);
  await screen.findByRole('table');
  return user;
}

/** Body rows only (the header row has no row header cell). */
function bodyRows() {
  return screen.getAllByRole('row').filter((row) => within(row).queryByRole('rowheader'));
}

function row(name: RegExp) {
  return screen.getByRole('row', { name });
}

describe('BookingsPanel: status filter', () => {
  it('shows every booking by default', async () => {
    await renderLoaded();
    expect(bodyRows()).toHaveLength(BOOKINGS.length);
    expect(screen.getByText(`Showing ${BOOKINGS.length} of ${BOOKINGS.length} bookings`)).toBeInTheDocument();
  });

  it('keeps only the bookings with the chosen status', async () => {
    const user = await renderLoaded();
    const filter = screen.getByRole('combobox', { name: 'Filter by status' });

    await user.selectOptions(filter, 'PENDING');
    const pending = bodyRows();
    expect(pending).toHaveLength(2);
    expect(pending.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      'Le Morne Beach Pavilion',
      'Grand Baie Sunset Deck',
    ]);
    pending.forEach((r) => expect(within(r).getByText('Pending')).toBeInTheDocument());

    await user.selectOptions(filter, 'REJECTED');
    expect(bodyRows()).toHaveLength(1);
    expect(row(/Chamarel Crater Terrace/)).toBeInTheDocument();

    await user.selectOptions(filter, 'ALL');
    expect(bodyRows()).toHaveLength(BOOKINGS.length);
  });

  it('shows per-status counts in the options', async () => {
    await renderLoaded();
    expect(screen.getByRole('option', { name: 'Pending (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Paid (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: `All statuses (${BOOKINGS.length})` })).toBeInTheDocument();
  });

  it('says so when no booking has the chosen status', async () => {
    server.use(http.get('/api/admin/bookings', () => HttpResponse.json(BOOKINGS.filter((b) => b.status !== 'PAID'))));
    const user = await renderLoaded();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'PAID');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No paid bookings.')).toBeInTheDocument();
  });

  it('only offers approve / reject on pending bookings', async () => {
    await renderLoaded();
    expect(within(row(LE_MORNE)).getByRole('button', { name: /approve/i })).toBeInTheDocument();
    for (const name of [/Port Louis/, /Chamarel/, /Blue Bay/, /Curepipe/]) {
      expect(within(row(name)).queryByRole('button')).not.toBeInTheDocument();
    }
  });
});

describe('BookingsPanel: loading', () => {
  it('shows the server error and recovers on retry', async () => {
    let fail = true;
    server.use(
      http.get('/api/admin/bookings', () =>
        fail ? HttpResponse.json({ error: 'database unavailable' }, { status: 503 }) : HttpResponse.json(BOOKINGS),
      ),
    );
    const user = userEvent.setup();
    render(<BookingsPanel />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load bookings. database unavailable');

    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(BOOKINGS.length);
  });

  it('shows the loading state again while a retry is in flight', async () => {
    let fail = true;
    const gate = deferred();
    server.use(
      http.get('/api/admin/bookings', async () => {
        if (fail) return HttpResponse.json({ error: 'database unavailable' }, { status: 503 });
        await gate.promise;
        return HttpResponse.json(BOOKINGS);
      }),
    );
    const user = userEvent.setup();
    render(<BookingsPanel />);
    const alert = await screen.findByRole('alert');

    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Loading bookings…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();

    gate.release();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('Loading bookings…')).not.toBeInTheDocument();
  });

  it('rejects a response that is not a list of bookings', async () => {
    server.use(http.get('/api/admin/bookings', () => HttpResponse.json([{ id: 1 }])));
    render(<BookingsPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('unexpected format');
  });
});

describe('BookingsPanel: approve / reject', () => {
  it('approves optimistically, then confirms with the server copy', async () => {
    const gate = deferred();
    const calls: string[] = [];
    server.use(
      http.post('/api/admin/bookings/:id/approve', async ({ params }) => {
        calls.push(String(params.id));
        await gate.promise;
        const booking = BOOKINGS.find((b) => b.id === params.id);
        return HttpResponse.json({ ...booking, status: 'APPROVED' });
      }),
    );
    const user = await renderLoaded();

    await user.click(within(row(LE_MORNE)).getByRole('button', { name: /approve booking for Le Morne/i }));

    // Before the server answers, the row already reads Approved and is busy.
    expect(within(row(LE_MORNE)).getByText('Approved')).toBeInTheDocument();
    expect(within(row(LE_MORNE)).queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(row(LE_MORNE)).toHaveAttribute('aria-busy', 'true');

    gate.release();
    expect(await screen.findByText('Booking for Le Morne Beach Pavilion on 2026-12-12 approved.')).toBeInTheDocument();
    expect(calls).toEqual(['b-1']);
    expect(within(row(LE_MORNE)).getByText('Approved')).toBeInTheDocument();
    expect(row(LE_MORNE)).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects via the reject endpoint and drops the row from the Pending view', async () => {
    const calls: string[] = [];
    server.use(
      http.post('/api/admin/bookings/:id/reject', ({ params }) => {
        calls.push(String(params.id));
        return HttpResponse.json({ ...BOOKINGS[3], status: 'REJECTED' });
      }),
    );
    const user = await renderLoaded();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'PENDING');

    await user.click(within(row(GRAND_BAIE)).getByRole('button', { name: /reject/i }));

    // Optimistic change moves it out of the "Pending" view immediately.
    expect(screen.queryByRole('row', { name: GRAND_BAIE })).not.toBeInTheDocument();
    expect(await screen.findByText(/Grand Baie Sunset Deck on 2027-01-09 rejected\./)).toBeInTheDocument();
    expect(calls).toEqual(['b-4']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'REJECTED');
    expect(within(row(GRAND_BAIE)).getByText('Rejected')).toBeInTheDocument();
  });

  it('rolls the row back and explains why when the server refuses', async () => {
    const gate = deferred();
    server.use(
      http.post('/api/admin/bookings/:id/approve', async () => {
        await gate.promise;
        return HttpResponse.json({ error: 'booking is no longer pending' }, { status: 409 });
      }),
    );
    const user = await renderLoaded();

    await user.click(within(row(LE_MORNE)).getByRole('button', { name: /approve/i }));
    expect(within(row(LE_MORNE)).getByText('Approved')).toBeInTheDocument();

    gate.release();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Could not approve the booking for Le Morne Beach Pavilion on 2026-12-12: booking is no longer pending. The change was undone.',
    );
    expect(within(row(LE_MORNE)).getByText('Pending')).toBeInTheDocument();
    expect(within(row(LE_MORNE)).getByRole('button', { name: /approve/i })).toBeEnabled();
  });

  it('rolls back on a network failure too', async () => {
    server.use(http.post('/api/admin/bookings/:id/reject', () => HttpResponse.error()));
    const user = await renderLoaded();

    await user.click(within(row(LE_MORNE)).getByRole('button', { name: /reject/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
    expect(within(row(LE_MORNE)).getByText('Pending')).toBeInTheDocument();
  });

  it('rolling back one row does not undo a concurrent decision on another', async () => {
    const failGate = deferred();
    server.use(
      http.post('/api/admin/bookings/:id/approve', async ({ params }) => {
        if (params.id === 'b-1') {
          await failGate.promise;
          return HttpResponse.json({ error: 'conflict' }, { status: 409 });
        }
        return HttpResponse.json({ ...BOOKINGS.find((b) => b.id === params.id), status: 'APPROVED' });
      }),
    );
    const user = await renderLoaded();

    await user.click(within(row(LE_MORNE)).getByRole('button', { name: /approve/i }));
    await user.click(within(row(GRAND_BAIE)).getByRole('button', { name: /approve/i }));
    await screen.findByText(/Grand Baie Sunset Deck on 2027-01-09 approved\./);

    failGate.release();
    await screen.findByRole('alert');
    expect(within(row(LE_MORNE)).getByText('Pending')).toBeInTheDocument();
    expect(within(row(GRAND_BAIE)).getByText('Approved')).toBeInTheDocument();
  });

  it('keeps the optimistic status when the server replies without a body', async () => {
    server.use(http.post('/api/admin/bookings/:id/approve', () => new HttpResponse(null, { status: 204 })));
    const user = await renderLoaded();

    await user.click(within(row(LE_MORNE)).getByRole('button', { name: /approve/i }));

    await screen.findByText(/approved\./);
    await waitFor(() => expect(row(LE_MORNE)).not.toHaveAttribute('aria-busy'));
    expect(within(row(LE_MORNE)).getByText('Approved')).toBeInTheDocument();
  });

  it('encodes the booking id in the request path', async () => {
    const paths: string[] = [];
    server.use(
      http.get('/api/admin/bookings', () => HttpResponse.json([{ ...BOOKINGS[0], id: 'a/b?c' }])),
      http.post('/api/admin/bookings/:id/approve', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await renderLoaded();
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await screen.findByText(/approved\./);
    expect(paths).toEqual(['/api/admin/bookings/a%2Fb%3Fc/approve']);
  });
});
