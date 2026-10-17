/**
 * Date tile of a card: big day number over a small month.
 */
export interface DayAndMonth {
  /**
   * Day of the month, without leading zero.
   */
  day: string;

  /**
   * Short month without its dot ("sept"), upper-cased by CSS.
   */
  month: string;
}
