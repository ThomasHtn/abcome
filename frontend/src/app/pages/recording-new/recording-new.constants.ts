import { RecorderErrorKind } from './recording-new.model';

/**
 * Number of bars of the waveforms, fine enough to read as a voice.
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
 * Translation key of the explanation of each microphone failure.
 */
export const RECORDER_ERROR_KEYS: Readonly<Record<RecorderErrorKind, string>> = {
  unsupported: 'recordingNew.error.unsupported',
  denied: 'recordingNew.error.denied',
  missing: 'recordingNew.error.missing',
  busy: 'recordingNew.error.busy',
  failed: 'recordingNew.error.failed',
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
