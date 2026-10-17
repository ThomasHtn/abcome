import { todayIso } from '@core/date/date.utils';

import { DATE_IN_FUTURE_MESSAGE, DATE_MISSING_MESSAGE } from './date-field.constants';

/**
 * Why a `yyyy-MM-dd` day cannot be saved, or null when it can: empty, or later than today in Paris.
 * Screens call it on their own value to disable their save button.
 */
export function dateFieldError(value: string, today: string = todayIso()): string | null {
  if (value === '') {
    return DATE_MISSING_MESSAGE;
  }
  // ISO days compare as text.
  return value > today ? DATE_IN_FUTURE_MESSAGE : null;
}
