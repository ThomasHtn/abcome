import { Toast } from './feedback.model';

/**
 * How long a toast stays: one sentence for a success, longer for a failure that tells what to do.
 */
export const TOAST_DURATIONS_MS: Readonly<Record<Toast['tone'], number>> = {
  success: 2400,
  error: 5000,
};

/**
 * How long the confetti burst lasts, matching `assets/celebration/confetti.svg`.
 */
export const CELEBRATION_DURATION_MS = 1400;

/**
 * Media query of a visitor asking for less motion, who gets no confetti.
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
