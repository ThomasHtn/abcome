import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { WAVEFORM_BAR_COUNT, WAVEFORM_SAMPLE_RATE } from './recording.constants';
import { waveformLevels } from './recording.utils';

/**
 * Waveforms of stored sounds, decoded in the browser from their audio and kept for the session.
 * A sound never changes, so each one is downloaded and decoded once; its bytes then come from the
 * browser cache when it is played.
 */
@Service()
export class Waveforms {
  /**
   * Downloads the audio bytes.
   */
  private readonly http = inject(HttpClient);

  /**
   * Waveform of each source, pending or done.
   */
  private readonly cache = new Map<string, Promise<number[]>>();

  /**
   * Levels of the sound at `src`, 0 to 1; empty when it cannot be decoded (an old browser, a format
   * it cannot read), so the strip falls back to flat bars.
   */
  public load(src: string): Promise<number[]> {
    let waveform = this.cache.get(src);
    if (!waveform) {
      waveform = this.decode(src).catch(() => {
        this.cache.delete(src);
        return [];
      });
      this.cache.set(src, waveform);
    }
    return waveform;
  }

  /**
   * Downloads and decodes the audio, then measures its loudness.
   */
  private async decode(src: string): Promise<number[]> {
    const bytes = await firstValueFrom(this.http.get(src, { responseType: 'arraybuffer' }));
    const context = new OfflineAudioContext(1, 1, WAVEFORM_SAMPLE_RATE);
    const audio = await context.decodeAudioData(bytes);
    return waveformLevels(audio.getChannelData(0), WAVEFORM_BAR_COUNT);
  }
}
