import { RECORDING_MIME_TYPES } from './recording.constants';

/**
 * First accepted format the browser can record, `null` when none (the recorder then cannot start).
 * `isSupported` is `MediaRecorder.isTypeSupported`, passed in so tests need no browser.
 */
export function pickRecordingMimeType(isSupported: (type: string) => boolean): string | null {
  return RECORDING_MIME_TYPES.find((type) => isSupported(type)) ?? null;
}

/**
 * "0:07", the recorder's clock.
 */
export function formatRecordingClock(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
