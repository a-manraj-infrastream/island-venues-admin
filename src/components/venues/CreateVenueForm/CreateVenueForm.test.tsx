import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { CreateVenueForm } from '@/components/venues/CreateVenueForm';
import { server } from '@/test/mocks/server';

type UserEvent = ReturnType<typeof userEvent.setup>;

/** Records every POST /api/admin/venues body; replies with `reply`. */
function captureCreates(reply: () => Response = () => HttpResponse.json({}, { status: 201 })) {
  const bodies: unknown[] = [];
  server.use(
    http.post('/api/admin/venues', async ({ request }) => {
      bodies.push(await request.json());
      return reply();
    }),
  );
  return bodies;
}

const field = (name: RegExp | string) => screen.getByLabelText(name);

async function fillValid(user: UserEvent) {
  await user.type(field('Venue name'), '  Tamarin Bay Boathouse  ');
  await user.type(field('Town'), 'Tamarin');
  await user.type(field('Capacity (guests)'), '120');
  await user.type(field('Price per day (MUR)'), '85000');
  await user.type(field('Description'), 'Open-sided boathouse on the bay, sunset views.');
  await user.type(field(/Tags/), 'Beach, sunset, beach ,  wedding');
}

const submit = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Create venue' }));

describe('CreateVenueForm: validation', () => {
  it('flags every required field, focuses the first, and sends nothing', async () => {
    const bodies = captureCreates();
    const user = userEvent.setup();
    render(<CreateVenueForm />);

    await submit(user);

    expect(field('Venue name')).toHaveAccessibleDescription('Enter the venue name.');
    expect(field('Town')).toHaveAccessibleDescription('Enter the town.');
    expect(field('Capacity (guests)')).toHaveAccessibleDescription('Enter the capacity.');
    expect(field('Price per day (MUR)')).toHaveAccessibleDescription('Enter the price per day.');
    expect(field('Description')).toHaveAccessibleDescription('Enter a short description.');
    expect(field(/Tags/)).not.toHaveAttribute('aria-invalid');
    expect(field('Venue name')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Venue name')).toHaveFocus();
    expect(bodies).toHaveLength(0);
  });

  it.each([
    ['Capacity (guests)', 'abc', 'Capacity must be a whole number.'],
    ['Capacity (guests)', '0', 'Capacity must be between 1 and 5000.'],
    ['Capacity (guests)', '5001', 'Capacity must be between 1 and 5000.'],
    ['Capacity (guests)', '12.5', 'Capacity must be a whole number.'],
    ['Price per day (MUR)', '-10', 'Price must be a whole number of rupees.'],
    ['Price per day (MUR)', '1e5', 'Price must be a whole number of rupees.'],
    ['Price per day (MUR)', '0', 'Price must be between 1 and 10,000,000 MUR.'],
  ])('rejects %s = %j', async (label, value, message) => {
    const bodies = captureCreates();
    const user = userEvent.setup();
    render(<CreateVenueForm />);
    await fillValid(user);

    await user.clear(field(label));
    await user.type(field(label), value);
    await submit(user);

    expect(field(label)).toHaveAccessibleDescription(message);
    expect(field(label)).toHaveFocus();
    expect(bodies).toHaveLength(0);
  });

  it('rejects malformed tags', async () => {
    captureCreates();
    const user = userEvent.setup();
    render(<CreateVenueForm />);
    await fillValid(user);
    await user.clear(field(/Tags/));
    await user.type(field(/Tags/), 'beach, open air!');
    await submit(user);
    expect(field(/Tags/)).toHaveAccessibleDescription(/Tags use letters, numbers and dashes/);
  });

  it('rejects an over-long name', async () => {
    captureCreates();
    const user = userEvent.setup();
    render(<CreateVenueForm />);
    await fillValid(user);
    await user.clear(field('Venue name'));
    await user.click(field('Venue name'));
    await user.paste('x'.repeat(81));
    await submit(user);
    expect(field('Venue name')).toHaveAccessibleDescription('Use at most 80 characters.');
  });

  it('clears a field error as soon as the field is edited', async () => {
    captureCreates();
    const user = userEvent.setup();
    render(<CreateVenueForm />);
    await submit(user);
    expect(field('Town')).toHaveAttribute('aria-invalid', 'true');

    await user.type(field('Town'), 'Curepipe');

    expect(field('Town')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Enter the town.')).not.toBeInTheDocument();
    expect(field('Venue name')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('CreateVenueForm: submit', () => {
  it('posts a trimmed, typed venue, confirms, and resets the form', async () => {
    const bodies = captureCreates(() =>
      HttpResponse.json(
        {
          id: 'v-13',
          name: 'Tamarin Bay Boathouse',
          town: 'Tamarin',
          capacity: 120,
          pricePerDayMur: 85000,
          description: 'Open-sided boathouse on the bay, sunset views.',
          tags: ['beach', 'sunset', 'wedding'],
        },
        { status: 201 },
      ),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<CreateVenueForm onCreated={onCreated} />);

    await fillValid(user);
    await submit(user);

    expect(await screen.findByText('Venue “Tamarin Bay Boathouse” created in Tamarin.')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        name: 'Tamarin Bay Boathouse',
        town: 'Tamarin',
        capacity: 120,
        pricePerDayMur: 85000,
        description: 'Open-sided boathouse on the bay, sunset views.',
        tags: ['beach', 'sunset', 'wedding'],
      },
    ]);
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-13' }));
    expect(field('Venue name')).toHaveValue('');
    expect(field(/Tags/)).toHaveValue('');
  });

  it('shows the server error and keeps what was typed', async () => {
    captureCreates(() => HttpResponse.json({ error: 'a venue with this name already exists' }, { status: 409 }));
    const user = userEvent.setup();
    render(<CreateVenueForm />);

    await fillValid(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not create the venue. a venue with this name already exists',
    );
    expect(field('Venue name')).toHaveValue('  Tamarin Bay Boathouse  ');
    expect(screen.getByRole('button', { name: 'Create venue' })).toBeEnabled();
  });

  it('explains a 403 from the edge in staff terms', async () => {
    captureCreates(() => new HttpResponse('Forbidden', { status: 403 }));
    const user = userEvent.setup();
    render(<CreateVenueForm />);
    await fillValid(user);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('You are not signed in as venue staff.');
  });
});
