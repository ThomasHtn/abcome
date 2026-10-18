/**
 * Message under a cleared or half-typed date field.
 */
export const DATE_MISSING_MESSAGE = 'Choisis une date.';

/**
 * Message under a date typed in the future, which the API refuses.
 */
export const DATE_IN_FUTURE_MESSAGE = 'La date ne peut pas être dans le futur.';

/**
 * Words for the two days families pick most, shown big instead of the date.
 */
export const RELATIVE_DAYS = { today: "Aujourd'hui", yesterday: 'Hier' } as const;

/**
 * Text of the field once cleared, until a day is picked.
 */
export const DATE_EMPTY_TEXT = 'Choisis un jour';
