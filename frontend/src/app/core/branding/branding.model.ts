/**
 * Name of the app, set per deployment so each family's notebook carries its own.
 */
export interface Branding {
  /**
   * Name of the app, such as "ABCome".
   */
  readonly name: string;

  /**
   * End of the name drawn in the accent colour on the login screen, empty for none.
   */
  readonly nameAccent: string;
}
