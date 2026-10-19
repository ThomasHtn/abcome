import { translate } from '@jsverse/transloco';

import { FIRST_NOTEBOOK_DAY } from '@core/date/date.constants';
import { addDays, formatWeekdayDate, todayIso } from '@core/date/date.utils';

import { DateDisplay } from './date-field.model';

/**
 * Why a `yyyy-MM-dd` day cannot be saved, or null when it can: empty, later than today in Paris, or
 * before the notebook's first day (a mistyped year).
 * Screens call it on their own value to disable their save button.
 */
export function dateFieldError(value: string, today: string = todayIso()): string | null {
  if (value === '') {
    return translate('dateField.missing');
  }
  // ISO days compare as text; the API refuses a future day.
  if (value > today) {
    return translate('dateField.inFuture');
  }
  return value < FIRST_NOTEBOOK_DAY ? translate('dateField.tooOld') : null;
}

/**
 * The day as people say it: "Aujourd'hui" or "Hier" over the full date, else the weekday and date,
 * with the year only when it is not this one.
 */
export function dateDisplay(value: string, today: string = todayIso()): DateDisplay {
  if (value === '') {
    return { title: translate('dateField.empty'), detail: null };
  }
  const currentYear = Number.parseInt(today.slice(0, 4), 10);
  const date = formatWeekdayDate(value, currentYear);
  if (value === today) {
    return { title: translate('dateField.today'), detail: date };
  }
  if (value === addDays(today, -1)) {
    return { title: translate('dateField.yesterday'), detail: date };
  }
  return { title: date, detail: null };
}
