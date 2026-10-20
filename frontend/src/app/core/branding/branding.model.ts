/**
 * Name of the app and zone of the family, set per deployment so each family's notebook carries its own.
 */
export interface Branding {
  /**
   * Name of the app, such as "Littlewords".
   */
  readonly name: string;

  /**
   * End of the name drawn in the accent colour on the login screen, empty for none.
   */
  readonly nameAccent: string;

  /**
   * IANA zone of the family, such as "Europe/Paris", in which "today" is judged.
   */
  readonly timeZone: string;
}
