import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { translate } from '@jsverse/transloco';

import { apiErrorCode, retryAfterSeconds } from '@core/http/api-error.utils';
import { isSingular } from '@core/i18n/i18n.utils';
import { MascotState } from '@shared/mascot/mascot.model';

import { SHORT_RETRY_SECONDS } from './login.constants';
import { LoginMascotContext } from './login.model';

/**
 * Message for a refused login; a bare 401 without code still means a wrong password.
 */
export function loginErrorMessage(error: unknown): string {
  const code = apiErrorCode(error);
  if (code === 'TOO_MANY_ATTEMPTS') {
    return tooManyAttemptsMessage(retryAfterSeconds(error));
  }
  const unauthorized =
    error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;
  // Wrong password: the server never says more, so neither do we.
  return translate(
    code === 'INVALID_CREDENTIALS' || unauthorized ? 'login.invalid' : 'login.unreachable',
  );
}

/**
 * Refusal message: a few seconds for a burst of sign-ins, else the lockout in whole minutes,
 * rounded up so the family never retries too early; the lockout holds for every device of the home.
 */
export function tooManyAttemptsMessage(seconds: number | null): string {
  if (seconds === null) {
    return translate('login.tooManyAttempts');
  }
  if (seconds < SHORT_RETRY_SECONDS) {
    return translate('login.busy');
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return translate(isSingular(minutes) ? 'login.lockedMinute' : 'login.lockedMinutes', { minutes });
}

/**
 * Lapinou jumps on success and covers his eyes while a hidden password is being typed.
 */
export function loginMascotState(context: LoginMascotContext): MascotState {
  if (context.succeeded) {
    return 'jump';
  }
  return context.focused && !context.visible && context.hasPassword ? 'hiding' : 'idle';
}
