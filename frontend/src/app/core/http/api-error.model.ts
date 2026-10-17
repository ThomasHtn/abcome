/**
 * Stable error codes of the API (docs/spec.md, REST API), the contract with `GlobalExceptionHandler`.
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

/**
 * Problem-details body of a failed API call.
 */
export interface ApiErrorResponse {
  /**
   * HTTP status code, repeated in the body.
   */
  status: number;

  /**
   * Application code; a string outside {@link ApiErrorCode} means a newer backend.
   */
  code: string;

  /**
   * Detail safe to log, never shown as is: the UI writes its own French message.
   */
  detail: string;

  /**
   * Validation messages by field name, empty when none.
   */
  errors: Record<string, string>;
}
