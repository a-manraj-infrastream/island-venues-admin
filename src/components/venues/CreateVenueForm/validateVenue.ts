import type { NewVenue } from '@/api';

/** Raw form state: every field is the string the staff member typed. */
export interface VenueFormValues {
  name: string;
  town: string;
  capacity: string;
  pricePerDayMur: string;
  description: string;
  tags: string;
}

export type VenueField = keyof VenueFormValues;
export type VenueErrors = Partial<Record<VenueField, string>>;

export const EMPTY_VENUE_FORM: VenueFormValues = {
  name: '',
  town: '',
  capacity: '',
  pricePerDayMur: '',
  description: '',
  tags: '',
};

export const LIMITS = {
  nameMax: 80,
  townMax: 60,
  capacityMax: 5000,
  priceMax: 10_000_000,
  descriptionMax: 1000,
  tagsMax: 8,
  tagMax: 24,
} as const;

const WHOLE_NUMBER = /^\d+$/;
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseTags(raw: string): string[] {
  const tags = raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag !== '');
  return [...new Set(tags)];
}

/**
 * Validates the create-venue form and, when valid, returns the request body.
 * Client-side checks are a convenience for staff; the API validates again.
 * Whole numbers only: capacity counts people and prices are whole rupees.
 */
export function validateVenue(values: VenueFormValues): { errors: VenueErrors; venue?: NewVenue } {
  const errors: VenueErrors = {};
  const name = values.name.trim();
  const town = values.town.trim();
  const description = values.description.trim();
  const capacityText = values.capacity.trim();
  const priceText = values.pricePerDayMur.trim();
  const tags = parseTags(values.tags);

  if (name === '') errors.name = 'Enter the venue name.';
  else if (name.length > LIMITS.nameMax) errors.name = `Use at most ${LIMITS.nameMax} characters.`;

  if (town === '') errors.town = 'Enter the town.';
  else if (town.length > LIMITS.townMax) errors.town = `Use at most ${LIMITS.townMax} characters.`;

  const capacity = Number(capacityText);
  if (capacityText === '') errors.capacity = 'Enter the capacity.';
  else if (!WHOLE_NUMBER.test(capacityText)) errors.capacity = 'Capacity must be a whole number.';
  else if (capacity < 1 || capacity > LIMITS.capacityMax)
    errors.capacity = `Capacity must be between 1 and ${LIMITS.capacityMax}.`;

  const price = Number(priceText);
  if (priceText === '') errors.pricePerDayMur = 'Enter the price per day.';
  else if (!WHOLE_NUMBER.test(priceText)) errors.pricePerDayMur = 'Price must be a whole number of rupees.';
  else if (price < 1 || price > LIMITS.priceMax)
    errors.pricePerDayMur = `Price must be between 1 and ${LIMITS.priceMax.toLocaleString('en-US')} MUR.`;

  if (description === '') errors.description = 'Enter a short description.';
  else if (description.length > LIMITS.descriptionMax)
    errors.description = `Use at most ${LIMITS.descriptionMax} characters.`;

  if (tags.length > LIMITS.tagsMax) errors.tags = `Use at most ${LIMITS.tagsMax} tags.`;
  else if (tags.some((tag) => tag.length > LIMITS.tagMax || !TAG.test(tag)))
    errors.tags = `Tags use letters, numbers and dashes (max ${LIMITS.tagMax} characters each).`;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    venue: { name, town, capacity, pricePerDayMur: price, description, tags },
  };
}
