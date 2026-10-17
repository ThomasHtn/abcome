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
 * French description of each state, for the image's alternative text.
 */
export const MASCOT_ALT: Readonly<Record<MascotState, string>> = {
  idle: 'Lapinou, la mascotte',
  hiding: 'Lapinou se cache les yeux',
  jump: 'Lapinou saute de joie',
};
