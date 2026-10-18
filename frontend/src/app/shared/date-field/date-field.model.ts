/**
 * What the date field shows of its day.
 */
export interface DateDisplay {
  /**
   * Big line: "Aujourd'hui", "Hier", or the weekday and date.
   */
  title: string;

  /**
   * Small line under it, the full date after a relative day; `null` otherwise.
   */
  detail: string | null;
}
