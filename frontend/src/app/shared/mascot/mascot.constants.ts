import { MascotState } from './mascot.model';

/**
 * Length of the jump in `jump.svg`, after which a tapped mascot returns to its state.
 */
export const MASCOT_JUMP_MS = 750;

/**
 * Height over width of every mascot asset (`viewBox="0 -30 120 150"`).
 */
export const MASCOT_ASPECT_RATIO = 1.25;

/**
 * Translation key describing each state, for the image's alternative text.
 */
export const MASCOT_ALT_KEYS: Readonly<Record<MascotState, string>> = {
  idle: 'mascot.idleAlt',
  hiding: 'mascot.hidingAlt',
  jump: 'mascot.jumpAlt',
};
