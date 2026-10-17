/**
 * A sentence Côme said, with what he meant when the family understood it.
 */
export interface Sentence {
  /**
   * Server identifier.
   */
  id: number;

  /**
   * What Côme said ("a pu ato").
   */
  spoken: string;

  /**
   * What he meant, `null` when not given.
   */
  meaning: string | null;

  /**
   * Day it was said, `yyyy-MM-dd`.
   */
  date: string;
}

/**
 * Body of a sentence creation or edit.
 */
export interface SentenceRequest {
  /**
   * What Côme said, 1 to 200 characters.
   */
  spoken: string;

  /**
   * What he meant, `null` or up to 200 characters.
   */
  meaning: string | null;

  /**
   * Day it was said, not in the future.
   */
  date: string;
}
