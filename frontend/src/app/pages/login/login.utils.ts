import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { apiErrorCode, retryAfterSeconds } from '@core/http/api-error.utils';
import { MascotState } from '@shared/mascot/mascot.model';

import { LOGIN_MESSAGES, SHORT_RETRY_SECONDS } from './login.constants';
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
  return code === 'INVALID_CREDENTIALS' || unauthorized
    ? LOGIN_MESSAGES.invalid
    : LOGIN_MESSAGES.unreachable;
}

/**
 * Refusal message: a few seconds for a burst of sign-ins, else the lockout in whole minutes,
 * rounded up so the family never retries too early; the lockout holds for every device of the home.
 */
export function tooManyAttemptsMessage(seconds: number | null): string {
  if (seconds === null) {
    return LOGIN_MESSAGES.tooManyAttempts;
  }
  if (seconds < SHORT_RETRY_SECONDS) {
    return LOGIN_MESSAGES.busy;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Trop d'essais\u00A0: le carnet est bloqué sur ce réseau, pour toute la maison. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`;
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
