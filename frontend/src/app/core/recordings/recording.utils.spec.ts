import { formatRecordingClock, pickRecordingMimeType, waveformLevels } from './recording.utils';

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
