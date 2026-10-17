import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorCode } from './api-error.model';

/**
 * Codes the frontend knows, to tell a contract code from an unexpected one.
 */
const KNOWN_CODES: readonly ApiErrorCode[] = [
  'INVALID_REQUEST',
  'NOT_FOUND',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'TOO_MANY_ATTEMPTS',
  'WORD_ALREADY_EXISTS',
  'LAST_PRONUNCIATION',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
];

/**
 * API error code of a failed call, `null` for a network failure or an unknown code.
 */
export function apiErrorCode(error: unknown): ApiErrorCode | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return null;
  }
  const code = body.code;
  return KNOWN_CODES.find((known) => known === code) ?? null;
}

/**
 * Seconds to wait from a 429's `Retry-After` header, `null` when absent or unreadable.
 */
export function retryAfterSeconds(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const seconds = Number.parseInt(error.headers.get('Retry-After') ?? '', 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/**
 * Whether a call failed with a 404, which no retry would fix.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
