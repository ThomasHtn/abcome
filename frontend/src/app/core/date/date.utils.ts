import { DAY_MS, FAMILY_TIME_ZONE, LONG_MONTHS, SHORT_MONTHS, WEEKDAYS } from './date.constants';
import { DayAndMonth } from './date.model';

/**
 * Today as `yyyy-MM-dd` in the family's time zone; `now` is a parameter so tests pin the clock.
 */
export function todayIso(now: Date = new Date()): string {
  // The Canadian locale prints ISO dates, so no manual padding is needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone: FAMILY_TIME_ZONE }).format(now);
}

/**
 * Year, month (1 to 12) and day of an ISO date, read as text so no time zone can shift it.
 */
function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return [year, month, day];
}

/**
 * "16 sept.", for lists where the year is obvious.
 */
export function formatShortDate(iso: string): string {
  const [, month, day] = parts(iso);
  return `${day} ${SHORT_MONTHS[month - 1]}`;
}

/**
 * "16 sept. 2026", for stage captions and the date field.
 */
export function formatShortDateWithYear(iso: string): string {
  const [year] = parts(iso);
  return `${formatShortDate(iso)} ${year}`;
}

/**
 * "16 septembre 2026", for screen reader labels and confirmations; without the year when it is
 * `currentYear`.
 */
export function formatLongDate(iso: string, currentYear?: number): string {
  const [year, month, day] = parts(iso);
  const date = `${day} ${LONG_MONTHS[month - 1]}`;
  return year === currentYear ? date : `${date} ${year}`;
}

/**
 * Day number and dot-less short month of the date tile on word and sentence cards ("16", "sept").
 */
export function dayAndMonth(iso: string): DayAndMonth {
  const [, month, day] = parts(iso);
  return { day: String(day), month: SHORT_MONTHS[month - 1].replace('.', '') };
}

/**
 * "samedi 18 octobre", for the date field; the year is added when it is not `currentYear`.
 */
export function formatWeekdayDate(iso: string, currentYear?: number): string {
  const [year, month, day] = parts(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const date = `${weekday} ${day} ${LONG_MONTHS[month - 1]}`;
  return currentYear === undefined || year === currentYear ? date : `${date} ${year}`;
}

/**
 * The ISO date `days` later (or earlier when negative), counted in UTC so no time zone shift applies.
 */
export function addDays(iso: string, days: number): string {
  const [year, month, day] = parts(iso);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * "Octobre 2026", the title of a month in a list.
 */
export function formatMonthYear(iso: string): string {
  const [year, month] = parts(iso);
  const name = LONG_MONTHS[month - 1];
  return `${name.charAt(0).toLocaleUpperCase('fr')}${name.slice(1)} ${year}`;
}
