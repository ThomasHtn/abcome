import {
  dayAndMonth,
  formatLongDate,
  formatShortDate,
  formatShortDateWithYear,
  todayIso,
} from './date.utils';

describe('todayIso', () => {
  it('uses the Paris calendar day, not the UTC one', () => {
    // 23:30 UTC on 16 October is already 17 October in Paris (UTC+2).
    expect(todayIso(new Date('2026-10-16T23:30:00Z'))).toBe('2026-10-17');
    expect(todayIso(new Date('2026-10-16T12:00:00Z'))).toBe('2026-10-16');
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

  it('prints the long form', () => {
    expect(formatLongDate('2026-09-16')).toBe('16 septembre 2026');
  });

  it('splits the card tile into day and dot-less month', () => {
    expect(dayAndMonth('2026-09-06')).toEqual({ day: '6', month: 'sept' });
    expect(dayAndMonth('2026-08-30')).toEqual({ day: '30', month: 'août' });
  });
});
