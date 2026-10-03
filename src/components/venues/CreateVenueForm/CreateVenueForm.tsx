import { useCallback, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, createVenue, type Venue } from '@/api';
import {
  EMPTY_VENUE_FORM,
  validateVenue,
  type VenueErrors,
  type VenueField,
  type VenueFormValues,
} from '@/components/venues/CreateVenueForm/validateVenue';
import styles from './CreateVenueForm.module.css';

/** Towns of the seeded venues; suggestions only, any town is accepted. */
const KNOWN_TOWNS = [
  'Belle Mare',
  'Blue Bay',
  'Chamarel',
  'Curepipe',
  'Flic en Flac',
  'Grand Baie',
  'Le Morne',
  'Mahébourg',
  'Pamplemousses',
  'Port Louis',
  'Tamarin',
  'Trou aux Biches',
];

const FIELD_ORDER: VenueField[] = ['name', 'town', 'capacity', 'pricePerDayMur', 'description', 'tags'];

interface Props {
  onCreated?: (venue: Venue) => void;
}

type Submit = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string } | { kind: 'done'; venue: Venue };

export function CreateVenueForm({ onCreated }: Props) {
  const idPrefix = useId();
  const fieldId = (field: VenueField) => `${idPrefix}-${field}`;
  const errorId = (field: VenueField) => `${idPrefix}-${field}-error`;
  const townsListId = `${idPrefix}-towns`;

  const [values, setValues] = useState<VenueFormValues>(EMPTY_VENUE_FORM);
  const [errors, setErrors] = useState<VenueErrors>({});
  const [submit, setSubmit] = useState<Submit>({ kind: 'idle' });
  const fieldRefs = useRef<Partial<Record<VenueField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // `name` attributes are the VenueField keys (set below); the cast is safe.
    const field = event.target.name as VenueField;
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as it is edited; it is re-checked on submit.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submit.kind === 'saving') return;

      const result = validateVenue(values);
      setErrors(result.errors);
      if (!result.venue) {
        // Move focus to the first invalid field so keyboard and screen-reader
        // users land on the problem instead of hunting for it.
        const first = FIELD_ORDER.find((field) => result.errors[field]);
        if (first) fieldRefs.current[first]?.focus();
        setSubmit({ kind: 'idle' });
        return;
      }

      setSubmit({ kind: 'saving' });
      try {
        const venue = await createVenue(result.venue);
        setValues(EMPTY_VENUE_FORM);
        setSubmit({ kind: 'done', venue });
        onCreated?.(venue);
      } catch (error: unknown) {
        setSubmit({
          kind: 'error',
          message: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
        });
      }
    },
    [onCreated, submit.kind, values],
  );

  const inputProps = (field: VenueField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    onChange: handleChange,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? errorId(field) : undefined,
    className: `${styles.control} ${errors[field] ? styles.invalid : ''}`,
  });

  const fieldError = (field: VenueField) =>
    errors[field] ? (
      <p id={errorId(field)} className={styles.error}>
        {errors[field]}
      </p>
    ) : null;

  const saving = submit.kind === 'saving';

  return (
    <section className={styles.panel} aria-labelledby={`${idPrefix}-heading`}>
      <h2 id={`${idPrefix}-heading`} className={styles.title}>
        Add a venue
      </h2>
      <p className={styles.subtitle}>New venues appear in the public catalogue straight away.</p>

      <form className={styles.form} noValidate onSubmit={handleSubmit} aria-busy={saving || undefined}>
        <div className={styles.field}>
          <label htmlFor={fieldId('name')} className={styles.label}>
            Venue name
          </label>
          <input
            {...inputProps('name')}
            ref={(el) => {
              fieldRefs.current.name = el;
            }}
            type="text"
            autoComplete="off"
          />
          {fieldError('name')}
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId('town')} className={styles.label}>
            Town
          </label>
          <input
            {...inputProps('town')}
            ref={(el) => {
              fieldRefs.current.town = el;
            }}
            type="text"
            autoComplete="off"
            list={townsListId}
          />
          <datalist id={townsListId}>
            {KNOWN_TOWNS.map((town) => (
              <option key={town} value={town} />
            ))}
          </datalist>
          {fieldError('town')}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor={fieldId('capacity')} className={styles.label}>
              Capacity (guests)
            </label>
            <input
              {...inputProps('capacity')}
              ref={(el) => {
                fieldRefs.current.capacity = el;
              }}
              type="text"
              inputMode="numeric"
            />
            {fieldError('capacity')}
          </div>

          <div className={styles.field}>
            <label htmlFor={fieldId('pricePerDayMur')} className={styles.label}>
              Price per day (MUR)
            </label>
            <input
              {...inputProps('pricePerDayMur')}
              ref={(el) => {
                fieldRefs.current.pricePerDayMur = el;
              }}
              type="text"
              inputMode="numeric"
            />
            {fieldError('pricePerDayMur')}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId('description')} className={styles.label}>
            Description
          </label>
          <textarea
            {...inputProps('description')}
            ref={(el) => {
              fieldRefs.current.description = el;
            }}
            rows={4}
          />
          {fieldError('description')}
        </div>

        <div className={styles.field}>
          <label htmlFor={fieldId('tags')} className={styles.label}>
            Tags <span className={styles.optional}>(optional, comma-separated)</span>
          </label>
          <input
            {...inputProps('tags')}
            ref={(el) => {
              fieldRefs.current.tags = el;
            }}
            type="text"
            autoComplete="off"
            placeholder="beach, sunset, wedding"
          />
          {fieldError('tags')}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create venue'}
          </button>
        </div>

        <div aria-live="polite">
          {submit.kind === 'done' && (
            <p className={`${styles.banner} ${styles.success}`}>
              Venue “{submit.venue.name}” created in {submit.venue.town}.
            </p>
          )}
        </div>
        {submit.kind === 'error' && (
          <p role="alert" className={`${styles.banner} ${styles.failure}`}>
            Could not create the venue. {submit.message}
          </p>
        )}
      </form>
    </section>
  );
}
