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
  denied:
    'Le micro est bloqué. Sur iPhone\u00A0: ouvre Réglages, cherche «\u00A0Safari\u00A0», puis Micro. ' +
    'Ailleurs\u00A0: les réglages du site, dans le navigateur.',
  missing: 'Aucun micro trouvé sur cet appareil.',
  busy: 'Le micro est déjà utilisé (un appel, une autre appli). Libère-le puis réessaie.',
  failed: "L'enregistrement n'a pas marché. Réessaie.",
};

/**
 * Bars of the waveform being trimmed: fine enough to place a handle, squeezed when fewer fit.
 */
export const TRIM_BAR_COUNT = 64;

/**
 * Handle step for an arrow key, and for Page Up or Page Down, in ms.
 */
export const TRIM_STEPS_MS = { fine: 100, coarse: 1000 } as const;

/**
 * Fade at each cut, so trimming in the middle of a sound does not click.
 */
export const TRIM_FADE_MS = 8;
