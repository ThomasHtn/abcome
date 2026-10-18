/**
 * Longest recording the API accepts; the recorder stops itself there.
 */
export const RECORDING_MAX_DURATION_MS = 15_000;

/**
 * Largest upload the API and Traefik accept, 2 MB.
 */
export const RECORDING_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Formats the API accepts, best first: Chrome and Firefox record WebM/Opus, Safari MP4/AAC.
 */
export const RECORDING_MIME_TYPES: readonly string[] = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

/**
 * Bars computed for a stored sound's waveform; the strip merges them when fewer fit.
 */
export const WAVEFORM_BAR_COUNT = 48;

/**
 * Rate the audio is decoded at for its waveform: enough for loudness, cheap to scan, accepted by Safari.
 */
export const WAVEFORM_SAMPLE_RATE = 22_050;
