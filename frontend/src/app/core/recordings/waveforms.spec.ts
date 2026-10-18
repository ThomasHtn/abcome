import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Waveforms } from './waveforms';

describe('Waveforms', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('decodes a sound once and measures its loudness', async () => {
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        /**
         * Decodes any bytes to a steady half-volume tone.
         */
        public decodeAudioData = () =>
          Promise.resolve({ getChannelData: () => new Float32Array(96).fill(0.5) });
      },
    );
    const waveforms = TestBed.inject(Waveforms);
    const http = TestBed.inject(HttpTestingController);

    const first = waveforms.load('/api/recordings/7');
    const second = waveforms.load('/api/recordings/7');
    http.expectOne('/api/recordings/7').flush(new ArrayBuffer(8));

    const levels = await first;
    expect(levels).toHaveLength(48);
    expect(levels.every((level) => level === 1)).toBe(true);
    expect(await second).toBe(levels);
  });

  it('gives no levels when the audio cannot be read, and tries again next time', async () => {
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        /**
         * Fails like a browser that cannot read the format.
         */
        public decodeAudioData = () => Promise.reject(new Error('unsupported'));
      },
    );
    const waveforms = TestBed.inject(Waveforms);
    const http = TestBed.inject(HttpTestingController);

    const levels = waveforms.load('/api/recordings/7');
    http.expectOne('/api/recordings/7').flush(new ArrayBuffer(8));

    expect(await levels).toEqual([]);
    void waveforms.load('/api/recordings/7');
    http.expectOne('/api/recordings/7');
  });
});
