import {
  encodeWav,
  formatRecordingClock,
  formatTenthsClock,
  pickRecordingMimeType,
  waveformLevels,
} from './recording.utils';

describe('pickRecordingMimeType', () => {
  it('prefers WebM with Opus when the browser has it', () => {
    expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('falls back to MP4 on Safari', () => {
    expect(pickRecordingMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
  });

  it('returns null when no accepted format can be recorded', () => {
    expect(pickRecordingMimeType(() => false)).toBeNull();
  });
});

describe('formatRecordingClock', () => {
  it('prints minutes and padded seconds', () => {
    expect(formatRecordingClock(7_400)).toBe('0:07');
    expect(formatRecordingClock(15_000)).toBe('0:15');
    expect(formatRecordingClock(0)).toBe('0:00');
  });
});

describe('waveformLevels', () => {
  it('keeps the peak of each slice, the loudest one full', () => {
    expect(waveformLevels([0.1, -0.2, 0.4, 0, -0.1, 0.05], 3)).toEqual([0.5, 1, 0.25]);
  });

  it('draws silence as flat bars', () => {
    expect(waveformLevels([0, 0, 0, 0], 2)).toEqual([0, 0]);
  });
});

describe('formatTenthsClock', () => {
  it('prints the tenths after a comma, rounded', () => {
    expect(formatTenthsClock(1_440)).toBe('0:01,4');
    expect(formatTenthsClock(2_960)).toBe('0:03,0');
    expect(formatTenthsClock(0)).toBe('0:00,0');
  });
});

describe('encodeWav', () => {
  it('writes a mono 16-bit PCM header followed by the clamped samples', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1, 2]), 22_050);
    const view = new DataView(await blob.arrayBuffer());
    const ascii = (offset: number) =>
      String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));

    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 4 * 2);
    expect([ascii(0), ascii(8), ascii(12), ascii(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22_050);
    expect(view.getUint32(40, true)).toBe(8);
    expect([44, 46, 48, 50].map((offset) => view.getInt16(offset, true))).toEqual([
      0, 32_767, -32_768, 32_767,
    ]);
  });
});
