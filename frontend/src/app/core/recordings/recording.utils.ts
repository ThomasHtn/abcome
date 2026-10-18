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

/**
 * Waveform of decoded samples: the peak of each of `count` slices, scaled so the loudest bar is full;
 * silence everywhere gives flat bars.
 */
export function waveformLevels(samples: ArrayLike<number>, count: number): number[] {
  const peaks = Array.from({ length: count }, (_, bar) => {
    const start = Math.floor((bar * samples.length) / count);
    const end = Math.floor(((bar + 1) * samples.length) / count);
    let peak = 0;
    for (let index = start; index < end; index++) {
      peak = Math.max(peak, Math.abs(samples[index]));
    }
    return peak;
  });
  const loudest = Math.max(...peaks);
  return loudest > 0 ? peaks.map((peak) => peak / loudest) : peaks;
}
