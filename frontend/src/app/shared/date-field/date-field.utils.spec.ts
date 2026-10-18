import { DATE_IN_FUTURE_MESSAGE, DATE_MISSING_MESSAGE } from './date-field.constants';
import { dateDisplay, dateFieldError } from './date-field.utils';

describe('dateFieldError', () => {
  it('accepts today and any past day', () => {
    expect(dateFieldError('2026-10-17', '2026-10-17')).toBeNull();
    expect(dateFieldError('2025-01-01', '2026-10-17')).toBeNull();
  });

  it('asks for a date when the field is empty', () => {
    expect(dateFieldError('', '2026-10-17')).toBe(DATE_MISSING_MESSAGE);
  });

  it('refuses a day after today', () => {
    expect(dateFieldError('2026-10-18', '2026-10-17')).toBe(DATE_IN_FUTURE_MESSAGE);
    expect(dateFieldError('2099-05-05', '2026-10-17')).toBe(DATE_IN_FUTURE_MESSAGE);
  });
});

describe('dateDisplay', () => {
  it('names today and yesterday, the full date under them', () => {
    expect(dateDisplay('2026-10-18', '2026-10-18')).toEqual({
      title: "Aujourd'hui",
      detail: 'dimanche 18 octobre',
    });
    expect(dateDisplay('2026-09-30', '2026-10-01')).toEqual({
      title: 'Hier',
      detail: 'mercredi 30 septembre',
    });
  });

  it('shows an older day as its weekday and date, the year only for another year', () => {
    expect(dateDisplay('2026-09-16', '2026-10-18')).toEqual({
      title: 'mercredi 16 septembre',
      detail: null,
    });
    expect(dateDisplay('2025-12-31', '2026-10-18').title).toBe('mercredi 31 décembre 2025');
  });

  it('invites to pick a day once cleared', () => {
    expect(dateDisplay('', '2026-10-18')).toEqual({ title: 'Choisis un jour', detail: null });
  });
});
