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

  /**
   * Birth date of the child, `yyyy-MM-dd`, so the cards tell his age; `null` when the family did not set it.
   */
  readonly childBirthDate: string | null;

  /**
   * Whether the visitor signed in with the reader password, and may only look.
   */
  readonly readOnly: boolean;
}
