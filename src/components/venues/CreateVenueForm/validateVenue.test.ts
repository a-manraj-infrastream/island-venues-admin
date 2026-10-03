import { EMPTY_VENUE_FORM, validateVenue } from '@/components/venues/CreateVenueForm/validateVenue';

const valid = {
  name: 'Belle Mare Beach Club',
  town: 'Belle Mare',
  capacity: '200',
  pricePerDayMur: '150000',
  description: 'Beachfront lawn and pavilion.',
  tags: '',
};

describe('validateVenue', () => {
  it('returns no venue for the empty form', () => {
    const result = validateVenue(EMPTY_VENUE_FORM);
    expect(result.venue).toBeUndefined();
    expect(Object.keys(result.errors).sort()).toEqual(['capacity', 'description', 'name', 'pricePerDayMur', 'town']);
  });

  it('normalises tags: trimmed, lower-cased, de-duplicated, empties dropped', () => {
    const result = validateVenue({ ...valid, tags: ' Beach ,sunset,,BEACH, sea-view ' });
    expect(result.venue?.tags).toEqual(['beach', 'sunset', 'sea-view']);
  });

  it('accepts the boundaries', () => {
    expect(validateVenue({ ...valid, capacity: '1', pricePerDayMur: '1' }).venue).toBeDefined();
    expect(validateVenue({ ...valid, capacity: '5000', pricePerDayMur: '10000000' }).venue).toBeDefined();
    expect(validateVenue({ ...valid, name: 'x'.repeat(80) }).venue).toBeDefined();
  });

  it('rejects more than eight tags', () => {
    const result = validateVenue({ ...valid, tags: 'a,b,c,d,e,f,g,h,i' });
    expect(result.errors.tags).toBe('Use at most 8 tags.');
  });

  it('rejects whitespace-only text fields', () => {
    const result = validateVenue({ ...valid, name: '   ', description: '\n\t' });
    expect(result.errors.name).toBe('Enter the venue name.');
    expect(result.errors.description).toBe('Enter a short description.');
  });
});
