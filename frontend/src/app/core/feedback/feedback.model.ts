/**
 * A short message shown after an action.
 */
export interface Toast {
  /**
   * Unique per display, to replay the entry animation.
   */
  id: number;

  /**
   * French text, one short sentence.
   */
  text: string;

  /**
   * `success` after a saved change, `error` when it failed.
   */
  tone: 'success' | 'error';
}
