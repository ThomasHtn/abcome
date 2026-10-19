/**
 * Earliest day the notebook accepts, as the API: catches a mistyped year (0202).
 */
export const FIRST_NOTEBOOK_DAY = '2020-01-01';

/**
 * Time zone of the family, so "today" never flips at midnight UTC.
 */
export const FAMILY_TIME_ZONE = 'Europe/Paris';

/**
 * Translation keys of the short month names, written out rather than taken from `Intl` so every browser
 * prints the same.
 */
export const SHORT_MONTHS: readonly string[] = [
  'date.shortJanuary',
  'date.shortFebruary',
  'date.shortMarch',
  'date.shortApril',
  'date.shortMay',
  'date.shortJune',
  'date.shortJuly',
  'date.shortAugust',
  'date.shortSeptember',
  'date.shortOctober',
  'date.shortNovember',
  'date.shortDecember',
];

/**
 * Translation keys of the full month names.
 */
export const LONG_MONTHS: readonly string[] = [
  'date.january',
  'date.february',
  'date.march',
  'date.april',
  'date.may',
  'date.june',
  'date.july',
  'date.august',
  'date.september',
  'date.october',
  'date.november',
  'date.december',
];

/**
 * Translation keys of the weekday names, Sunday first like `Date.getUTCDay()`.
 */
export const WEEKDAYS: readonly string[] = [
  'date.sunday',
  'date.monday',
  'date.tuesday',
  'date.wednesday',
  'date.thursday',
  'date.friday',
  'date.saturday',
];

/**
 * One day in milliseconds, to step between calendar days in UTC.
 */
export const DAY_MS = 86_400_000;
