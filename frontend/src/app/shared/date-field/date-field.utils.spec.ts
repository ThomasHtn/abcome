import { DATE_IN_FUTURE_MESSAGE, DATE_MISSING_MESSAGE } from './date-field.constants';
import { dateFieldError } from './date-field.utils';

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
