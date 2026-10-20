import { DEFAULT_TIME_ZONE } from './date.constants';
import {
  addDays,
  ageInMonths,
  atAge,
  dayAndMonth,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatShortDateWithYear,
  formatWeekdayDate,
  monthsUnit,
  setFamilyTimeZone,
  todayIso,
} from './date.utils';

describe('todayIso', () => {
  afterEach(() => setFamilyTimeZone(DEFAULT_TIME_ZONE));

  it('uses the Paris calendar day, not the UTC one', () => {
    // 23:30 UTC on 16 October is already 17 October in Paris (UTC+2).
    expect(todayIso(new Date('2026-10-16T23:30:00Z'))).toBe('2026-10-17');
    expect(todayIso(new Date('2026-10-16T12:00:00Z'))).toBe('2026-10-16');
  });

  it('follows the zone the server gives, and ignores one the browser does not know', () => {
    // 03:00 UTC on 17 October is still 16 October in Montreal (UTC-4).
    setFamilyTimeZone('America/Montreal');
    expect(todayIso(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-16');
    setFamilyTimeZone('Mars/Olympus_Mons');
    expect(todayIso(new Date('2026-10-17T03:00:00Z'))).toBe('2026-10-16');
  });
});

describe('French date formats', () => {
  it('prints the short form without the year', () => {
    expect(formatShortDate('2026-09-16')).toBe('16 sept.');
    expect(formatShortDate('2026-05-01')).toBe('1 mai');
  });

  it('prints the short form with the year', () => {
    expect(formatShortDateWithYear('2026-10-17')).toBe('17 oct. 2026');
  });

  it('titles a month with its year', () => {
    expect(formatMonthYear('2026-10-17')).toBe('Octobre 2026');
    expect(formatMonthYear('2025-08-01')).toBe('Août 2025');
  });

  it('prints the long form', () => {
    expect(formatLongDate('2026-09-16')).toBe('16 septembre 2026');
    expect(formatLongDate('2026-09-16', 2026)).toBe('16 septembre');
    expect(formatLongDate('2025-09-16', 2026)).toBe('16 septembre 2025');
  });

  it('splits the card tile into day and dot-less month', () => {
    expect(dayAndMonth('2026-09-06')).toEqual({ day: '6', month: 'sept' });
    expect(dayAndMonth('2026-08-30')).toEqual({ day: '30', month: 'août' });
  });

  it('prints the weekday form, with the year only when it is not the current one', () => {
    expect(formatWeekdayDate('2026-10-18', 2026)).toBe('dimanche 18 octobre');
    expect(formatWeekdayDate('2025-12-31', 2026)).toBe('mercredi 31 décembre 2025');
  });
});

describe('child age', () => {
  it('counts whole months, the month turning on the day of birth', () => {
    expect(ageInMonths('2025-05-12', '2026-10-11')).toBe(16);
    expect(ageInMonths('2025-05-12', '2026-10-12')).toBe(17);
    expect(ageInMonths('2025-05-31', '2025-06-30')).toBe(0);
    expect(ageInMonths('2025-05-12', '2025-01-01')).toBe(0);
  });

  it('words an age in months', () => {
    expect(monthsUnit(17)).toBe('mois');
    expect(atAge(17)).toBe('à 17\u00A0mois');
  });

  it('adds the year to a short date of another year only', () => {
    expect(formatShortDate('2026-10-19', 2026)).toBe('19 oct.');
    expect(formatShortDate('2026-10-19', 2027)).toBe('19 oct. 2026');
  });
});

describe('addDays', () => {
  it('steps across months and years', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
