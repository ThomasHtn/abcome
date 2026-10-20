/**
 * Stable error codes of the API, the contract with `GlobalExceptionHandler`.
 */
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'TOO_MANY_ATTEMPTS'
  | 'WORD_ALREADY_EXISTS'
  | 'LAST_PRONUNCIATION'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE';
