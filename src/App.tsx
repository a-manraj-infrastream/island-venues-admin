import { AppShell } from '@/components/scaffold/AppShell';
import { BookingsPanel } from '@/components/bookings/BookingsPanel';
import { CreateVenueForm } from '@/components/venues/CreateVenueForm';

export function App() {
  return (
    <AppShell>
      <BookingsPanel />
      <CreateVenueForm />
    </AppShell>
  );
}
