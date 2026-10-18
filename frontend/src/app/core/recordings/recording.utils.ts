import { RECORDING_MIME_TYPES, TRIMMED_MIME_TYPE } from './recording.constants';

/**
 * Size of the RIFF header before the samples of a mono PCM WAV.
 */
const WAV_HEADER_BYTES = 44;

/**
 * Bytes of one 16-bit sample.
 */
const WAV_BYTES_PER_SAMPLE = 2;

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

/**
 * "0:01,4", the clock of a sound being trimmed, to the tenth of a second.
 */
export function formatTenthsClock(durationMs: number): string {
  const tenths = Math.round(durationMs / 100);
  return `${formatRecordingClock(Math.floor(tenths / 10) * 1000)},${tenths % 10}`;
}

/**
 * Mono 16-bit PCM WAV of `samples` (-1 to 1), the one format a browser can write without a library.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * WAV_BYTES_PER_SAMPLE;
  const view = new DataView(new ArrayBuffer(WAV_HEADER_BYTES + dataBytes));
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * WAV_BYTES_PER_SAMPLE, true);
  view.setUint16(32, WAV_BYTES_PER_SAMPLE, true);
  view.setUint16(34, WAV_BYTES_PER_SAMPLE * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      WAV_HEADER_BYTES + index * WAV_BYTES_PER_SAMPLE,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true,
    );
  });
  return new Blob([view.buffer], { type: TRIMMED_MIME_TYPE });
}

/**
 * Writes a four-letter chunk name of the WAV header.
 */
function writeAscii(view: DataView, offset: number, text: string): void {
  [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
}
