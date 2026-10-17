import { PronunciationStatus } from '@core/words/word.model';

/**
 * A stage being typed: what Côme said, how close it was, and when.
 */
export interface PronunciationDraft {
  /**
   * What Côme said, as typed (trimmed only when sent).
   */
  spoken: string;

  /**
   * How close it was to the word.
   */
  status: PronunciationStatus;

  /**
   * Day it was said, `yyyy-MM-dd`.
   */
  date: string;
}
