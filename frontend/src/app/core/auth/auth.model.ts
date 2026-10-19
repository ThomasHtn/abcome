/**
 * Session state as the frontend knows it; `unknown` until the server has been asked.
 */
export type AuthStatus = 'unknown' | 'signed-in' | 'signed-out';

/**
 * Answer of the session check and the login, which only a signed-in visitor receives.
 */
export interface SessionInfo {
  /**
   * First name of the child, kept out of the repository and the login screen.
   */
  readonly childName: string;
}
