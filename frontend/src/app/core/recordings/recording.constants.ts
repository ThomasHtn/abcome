/**
 * Longest recording the API accepts; the recorder stops itself there.
 */
export const RECORDING_MAX_DURATION_MS = 15_000;

/**
 * Largest upload the API and the reverse proxy accept, 2 MB.
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
 * Percentile of the bar peaks drawn full: a few louder bars, like a click, are capped instead of
 * shrinking the voice.
 */
export const WAVEFORM_REFERENCE_PERCENTILE = 0.9;

/**
 * Share of the loudest peak the full height never goes under, so a short word in a long sound keeps
 * its silence flat.
 */
export const WAVEFORM_MIN_REFERENCE = 0.25;

/**
 * Rate the audio is decoded at for its waveform: enough for loudness, cheap to scan, accepted by Safari.
 */
export const WAVEFORM_SAMPLE_RATE = 22_050;

/**
 * Type of a sound trimmed in the browser, which can decode a recording but not re-encode webm or mp4.
 */
export const TRIMMED_MIME_TYPE = 'audio/wav';

/**
 * Rate a recording is decoded and trimmed at: clear for a child's voice, 15 s of WAV stay under 700 KB.
 */
export const TRIM_SAMPLE_RATE = 22_050;
