/**
 * Controls that can take focus, disabled ones and those out of the tab order excluded.
 */
export const FOCUSABLE_SELECTOR = [
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
