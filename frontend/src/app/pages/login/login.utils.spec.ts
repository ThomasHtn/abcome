import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { LOGIN_MESSAGES } from './login.constants';
import { loginErrorMessage, loginMascotState, tooManyAttemptsMessage } from './login.utils';

/**
 * Builds a refused login as HttpClient reports it.
 */
function refusal(status: number, code: string | null, retryAfter?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: code ? { code } : null,
    headers: retryAfter ? new HttpHeaders({ 'Retry-After': retryAfter }) : new HttpHeaders(),
  });
}

describe('loginErrorMessage', () => {
  it('says the password is wrong for INVALID_CREDENTIALS and for a bare 401', () => {
    expect(loginErrorMessage(refusal(401, 'INVALID_CREDENTIALS'))).toBe(LOGIN_MESSAGES.invalid);
    expect(loginErrorMessage(refusal(401, null))).toBe(LOGIN_MESSAGES.invalid);
  });

  it('gives the lockout time in minutes', () => {
    expect(loginErrorMessage(refusal(429, 'TOO_MANY_ATTEMPTS', '900'))).toBe(
      "Trop d'essais. Réessaie dans 15 minutes.",
    );
  });

  it('falls back to a connection message for anything else', () => {
    expect(loginErrorMessage(refusal(0, null))).toBe(LOGIN_MESSAGES.unreachable);
    expect(loginErrorMessage(new Error('boom'))).toBe(LOGIN_MESSAGES.unreachable);
  });
});

describe('tooManyAttemptsMessage', () => {
  it('rounds the lockout up and agrees in number', () => {
    expect(tooManyAttemptsMessage(60)).toBe("Trop d'essais. Réessaie dans 1 minute.");
    expect(tooManyAttemptsMessage(61)).toBe("Trop d'essais. Réessaie dans 2 minutes.");
  });

  it('speaks of seconds for a short burst limit', () => {
    expect(tooManyAttemptsMessage(1)).toBe(LOGIN_MESSAGES.busy);
    expect(tooManyAttemptsMessage(59)).toBe(LOGIN_MESSAGES.busy);
  });

  it('stays vague without a delay', () => {
    expect(tooManyAttemptsMessage(null)).toBe(LOGIN_MESSAGES.tooManyAttempts);
  });
});

describe('loginMascotState', () => {
  /**
   * Field focused, password hidden and typed: the case where Lapinou hides.
   */
  const typing = { succeeded: false, focused: true, visible: false, hasPassword: true };

  it('hides his eyes while a hidden password is typed', () => {
    expect(loginMascotState(typing)).toBe('hiding');
  });

  it('looks when the password is shown, empty or not focused', () => {
    expect(loginMascotState({ ...typing, visible: true })).toBe('idle');
    expect(loginMascotState({ ...typing, hasPassword: false })).toBe('idle');
    expect(loginMascotState({ ...typing, focused: false })).toBe('idle');
  });

  it('jumps once the password is accepted', () => {
    expect(loginMascotState({ ...typing, succeeded: true })).toBe('jump');
  });
});
