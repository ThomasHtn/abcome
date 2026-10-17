import { RecorderErrorKind } from './recording-new.model';

/**
 * Number of bars of the waveforms, like the mockup.
 */
export const LEVEL_BAR_COUNT = 28;

/**
 * Shortest clip worth keeping: below it, a tap on stop came too early (the API refuses under 300 ms).
 */
export const MIN_KEEP_MS = 500;

/**
 * Interval between two loudness samples and clock updates while recording.
 */
export const RECORDER_TICK_MS = 100;

/**
 * Loudness gain: speech rarely goes past a third of full scale, so its bars would stay small.
 */
export const LEVEL_GAIN = 3;

/**
 * French explanation of each microphone failure.
 */
export const RECORDER_ERROR_MESSAGES: Readonly<Record<RecorderErrorKind, string>> = {
  unsupported: 'Ce navigateur ne sait pas enregistrer de son. Essaie avec Safari ou Chrome à jour.',
  denied: 'Le micro est bloqué. Autorise-le dans les réglages du navigateur, puis réessaie.',
  missing: 'Aucun micro trouvé sur cet appareil.',
  failed: "L'enregistrement n'a pas marché. Réessaie.",
};
