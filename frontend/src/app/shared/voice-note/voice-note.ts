import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';

import { WAVEFORM_BAR_COUNT } from '@core/recordings/recording.constants';
import { formatRecordingClock } from '@core/recordings/recording.utils';
import { Waveforms } from '@core/recordings/waveforms';
import { AudioButton } from '@shared/audio-button/audio-button';
import { LevelBars } from '@shared/level-bars/level-bars';

/**
 * Flat bars shown until the waveform is decoded, or when it cannot be.
 */
const FLAT_WAVEFORM: readonly number[] = Array<number>(WAVEFORM_BAR_COUNT).fill(0);

/**
 * A stored sound as a voice message: play button, time played, its waveform darkening from the left
 * while it plays, and its length.
 * Usage: `<app-voice-note [src]="url" label="Écouter le son" [durationMs]="3200" />`.
 */
@Component({
  selector: 'app-voice-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AudioButton, LevelBars],
  templateUrl: './voice-note.html',
  styleUrl: './voice-note.scss',
})
export class VoiceNote {
  /**
   * Decodes the waveform of the sound.
   */
  private readonly waveforms = inject(Waveforms);

  /**
   * Audio to play, `API_ENDPOINTS.recording(id)`.
   */
  public readonly src = input.required<string>();

  /**
   * Screen reader name of the play button.
   */
  public readonly label = input.required<string>();

  /**
   * Length measured when it was recorded; the stored audio may not know its own.
   */
  public readonly durationMs = input.required<number>();

  /**
   * Play button size: `md` on its own, `sm` inside a card row.
   */
  public readonly size = input<'sm' | 'md'>('md');

  /**
   * Playback position, 0 when stopped.
   */
  protected readonly positionMs = signal(0);

  /**
   * Waveform of the sound, decoded once per source.
   */
  private readonly waveform = resource({
    params: () => this.src(),
    loader: ({ params }) => this.waveforms.load(params),
  });

  /**
   * Bars drawn: the decoded waveform, flat until it is ready or when it cannot be decoded.
   */
  protected readonly levels = computed(() => {
    const levels = this.waveform.hasValue() ? this.waveform.value() : [];
    return levels.length > 0 ? levels : FLAT_WAVEFORM;
  });

  /**
   * Share already played, 0 to 1.
   */
  protected readonly progress = computed(() =>
    this.durationMs() > 0 ? Math.min(1, this.positionMs() / this.durationMs()) : 0,
  );

  /**
   * "0:01", the time played.
   */
  protected readonly elapsed = computed(() =>
    formatRecordingClock(Math.min(this.positionMs(), this.durationMs())),
  );

  /**
   * "0:03", rounded to the nearest second and at least one, so a short sound never reads "0:00".
   */
  protected readonly length = computed(() =>
    formatRecordingClock(Math.max(1, Math.round(this.durationMs() / 1000)) * 1000),
  );
}
