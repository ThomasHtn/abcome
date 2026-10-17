/**
 * Session state as the frontend knows it; `unknown` until the server has been asked.
 */
export type AuthStatus = 'unknown' | 'signed-in' | 'signed-out';
