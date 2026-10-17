/**
 * Time zone of the family, so "today" never flips at midnight UTC.
 */
export const FAMILY_TIME_ZONE = 'Europe/Paris';

/**
 * Short French month names, written out rather than taken from `Intl` so every browser prints the same.
 */
export const SHORT_MONTHS: readonly string[] = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/**
 * Full French month names.
 */
export const LONG_MONTHS: readonly string[] = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
