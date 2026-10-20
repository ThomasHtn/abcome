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

  /**
   * Button inside the toast ("Annuler"), absent for a plain message.
   */
  action?: ToastAction;
}

/**
 * A button offered by a toast, such as undoing the change it reports.
 */
export interface ToastAction {
  /**
   * Button text, one word.
   */
  label: string;

  /**
   * Runs on tap; the toast hides first.
   */
  run: () => void;
}
