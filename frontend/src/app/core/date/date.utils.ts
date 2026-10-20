import { translate } from '@jsverse/transloco';

import { activeLocale, isSingular } from '@core/i18n/i18n.utils';

import { DAY_MS, DEFAULT_TIME_ZONE, LONG_MONTHS, SHORT_MONTHS, WEEKDAYS } from './date.constants';
import { DayAndMonth } from './date.model';

/**
 * Zone in which "today" is judged, set once at startup from the server.
 */
let familyTimeZone = DEFAULT_TIME_ZONE;

/**
 * Judges every "today" in `zone` from now on; a zone this browser does not know keeps the current one.
 */
export function setFamilyTimeZone(zone: string): void {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: zone });
    familyTimeZone = zone;
  } catch {
    // RangeError: an unknown zone, kept out so todayIso() never throws.
  }
}

/**
 * Today as `yyyy-MM-dd` in the family's time zone; `now` is a parameter so tests pin the clock.
 */
export function todayIso(now: Date = new Date()): string {
  // The Canadian locale prints ISO dates, so no manual padding is needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone: familyTimeZone }).format(now);
}

/**
 * Year, month (1 to 12) and day of an ISO date, read as text so no time zone can shift it.
 */
function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return [year, month, day];
}

/**
 * "16 sept.", for lists where the year is obvious; with the year when it is not `currentYear`.
 */
export function formatShortDate(iso: string, currentYear?: number): string {
  const [year, month, day] = parts(iso);
  const date = translate('date.short', { day, month: translate(SHORT_MONTHS[month - 1]) });
  return currentYear === undefined || year === currentYear
    ? date
    : translate('date.shortWithYear', { date, year });
}

/**
 * Whole months of life on `iso` for a child born on `birthIso`, as paediatricians count them
 * (17 months from the 12th to the 11th); 0 before the first month or before birth.
 */
export function ageInMonths(birthIso: string, iso: string): number {
  const [birthYear, birthMonth, birthDay] = parts(birthIso);
  const [year, month, day] = parts(iso);
  const months = (year - birthYear) * 12 + (month - birthMonth) - (day < birthDay ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Unit under the months of an age tile, agreed with the number ("mois", "months").
 */
export function monthsUnit(months: number): string {
  return translate(isSingular(months) ? 'date.monthUnitOne' : 'date.monthUnitOther');
}

/**
 * "à 17 mois", when a moment happened in the child's life.
 */
export function atAge(months: number): string {
  return translate(isSingular(months) ? 'date.atAgeOne' : 'date.atAgeOther', { months });
}

/**
 * "16 sept. 2026", for stage captions and the date field.
 */
export function formatShortDateWithYear(iso: string): string {
  const [year] = parts(iso);
  return translate('date.shortWithYear', { date: formatShortDate(iso), year });
}

/**
 * "16 septembre 2026", for screen reader labels and confirmations; without the year when it is
 * `currentYear`.
 */
export function formatLongDate(iso: string, currentYear?: number): string {
  const [year, month, day] = parts(iso);
  const name = translate(LONG_MONTHS[month - 1]);
  return year === currentYear
    ? translate('date.long', { day, month: name })
    : translate('date.longWithYear', { day, month: name, year });
}

/**
 * Day number and dot-less short month of the date tile on word and sentence cards ("16", "sept").
 */
export function dayAndMonth(iso: string): DayAndMonth {
  const [, month, day] = parts(iso);
  return { day: String(day), month: translate(SHORT_MONTHS[month - 1]).replace('.', '') };
}

/**
 * "samedi 18 octobre", for the date field; the year is added when it is not `currentYear`.
 */
export function formatWeekdayDate(iso: string, currentYear?: number): string {
  const [year, month, day] = parts(iso);
  const weekday = translate(WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]);
  const name = translate(LONG_MONTHS[month - 1]);
  return currentYear === undefined || year === currentYear
    ? translate('date.weekday', { weekday, day, month: name })
    : translate('date.weekdayWithYear', { weekday, day, month: name, year });
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
  const name = translate(LONG_MONTHS[month - 1]);
  const title = `${name.charAt(0).toLocaleUpperCase(activeLocale())}${name.slice(1)}`;
  return translate('date.monthYear', { month: title, year });
}
