import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { formatRecordingClock } from '@core/recordings/recording.utils';
import { AudioButton } from '@shared/audio-button/audio-button';
import { LevelBars } from '@shared/level-bars/level-bars';

/**
 * Reminder of the recorded sound at the top of the next steps: play button, waveform, length.
 */
@Component({
  selector: 'app-recording-clip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AudioButton, LevelBars, TranslocoPipe],
  templateUrl: './recording-clip.html',
  styleUrl: './recording-clip.scss',
})
export class RecordingClip {
  /**
   * Object URL of the recorded audio.
   */
  public readonly src = input.required<string>();

  /**
   * Its waveform, one level per bar.
   */
  public readonly levels = input.required<readonly number[]>();

  /**
   * Its length.
   */
  public readonly durationMs = input.required<number>();

  /**
   * Whether it is playing, to darken the bars.
   */
  protected readonly playing = signal(false);

  /**
   * "0:04".
   */
  protected readonly duration = computed(() => formatRecordingClock(this.durationMs()));
}
