import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { apiErrorCode, isNotFound, retryAfterSeconds } from './api-error.utils';

describe('apiErrorCode', () => {
  it('reads a contract code from the problem body', () => {
    const error = new HttpErrorResponse({ status: 409, error: { code: 'WORD_ALREADY_EXISTS' } });

    expect(apiErrorCode(error)).toBe('WORD_ALREADY_EXISTS');
  });

  it('returns null for an unknown code, a bodiless error or a non-HTTP error', () => {
    expect(
      apiErrorCode(new HttpErrorResponse({ status: 500, error: { code: 'BOOM' } })),
    ).toBeNull();
    expect(apiErrorCode(new HttpErrorResponse({ status: 0, error: null }))).toBeNull();
    expect(apiErrorCode(new Error('offline'))).toBeNull();
  });
});

describe('retryAfterSeconds', () => {
  it('reads the Retry-After header of a 429', () => {
    const error = new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': '900' }),
    });

    expect(retryAfterSeconds(error)).toBe(900);
  });

  it('returns null without a readable header', () => {
    expect(retryAfterSeconds(new HttpErrorResponse({ status: 429 }))).toBeNull();
    expect(retryAfterSeconds('nope')).toBeNull();
  });
});

describe('isNotFound', () => {
  it('only matches a 404', () => {
    expect(isNotFound(new HttpErrorResponse({ status: 404 }))).toBe(true);
    expect(isNotFound(new HttpErrorResponse({ status: 500 }))).toBe(false);
  });
});
