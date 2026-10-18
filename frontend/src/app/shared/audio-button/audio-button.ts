import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { ToastQueue } from '@core/feedback/toast-queue';
import { Icon } from '@shared/icon/icon';

/**
 * Play and stop icon sizes, in px, per button size.
 */
const ICON_SIZES = {
  sm: { play: 18, stop: 14 },
  md: { play: 22, stop: 18 },
  lg: { play: 40, stop: 34 },
} as const;

/**
 * Toast of a sound the device cannot play (a WebM on an old iPhone) or that did not download.
 */
const PLAYBACK_FAILURE = "Ce son n'a pas pu être lu sur cet appareil.";

/**
 * Stops the sound playing now, so starting another one cuts it: one sound at a time on a screen.
 */
let stopPlaying: (() => void) | null = null;

/**
 * Round lavender play/stop button for a recording (a word's sound, or a fresh recording's blob URL).
 * The audio is only fetched on the first tap.
 */
@Component({
  selector: 'app-audio-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './audio-button.html',
  styleUrl: './audio-button.scss',
})
export class AudioButton {
  /**
   * Tells a playback failure.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Player of the current source, created on first play.
   */
  private audio: HTMLAudioElement | null = null;

  /**
   * Animation frame reporting the playback position, 0 when none is pending.
   */
  private frame = 0;

  /**
   * Audio to play: `API_ENDPOINTS.recording(id)` or an object URL.
   */
  public readonly src = input.required<string>();

  /**
   * Screen reader name while stopped ("Écouter le son de « apin »").
   */
  public readonly label = input.required<string>();

  /**
   * `sm` 44 px inside a card row, `md` 52 px in lists, `lg` 112 px as the recorder's main control.
   */
  public readonly size = input<'sm' | 'md' | 'lg'>('md');

  /**
   * Emitted when playback starts or stops, so a screen can animate a waveform.
   */
  public readonly playingChange = output<boolean>();

  /**
   * Playback position in milliseconds, every frame while playing, back to 0 when it stops.
   */
  public readonly positionChange = output<number>();

  /**
   * Whether the sound is playing.
   */
  protected readonly playing = signal(false);

  /**
   * Sizes of the play and stop icons for the button's size.
   */
  protected readonly iconSize = computed(() => ICON_SIZES[this.size()]);

  /**
   * Stops the sound when its source changes or the button goes away.
   */
  constructor() {
    // A new source stops the old one, so two sounds never overlap; only `src` is tracked.
    effect(() => {
      this.src();
      untracked(() => this.release());
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }

  /**
   * Stops this button's sound, registered as `stopPlaying` while it plays.
   */
  private readonly stopper = (): void => this.stop();

  /**
   * Plays from the start, or stops when already playing.
   */
  protected async toggle(): Promise<void> {
    if (this.playing()) {
      this.stop();
      return;
    }
    stopPlaying?.();
    stopPlaying = this.stopper;
    this.audio ??= this.createPlayer();
    this.audio.currentTime = 0;
    this.setPlaying(true);
    try {
      await this.audio.play();
    } catch (error) {
      // A stop or another sound interrupting the start is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.setPlaying(false);
      } else {
        this.fail();
      }
    }
  }

  /**
   * Player wired to come back to "play" at the end of the sound, or on a failure while playing.
   */
  private createPlayer(): HTMLAudioElement {
    const audio = new Audio(this.src());
    audio.addEventListener('ended', () => this.setPlaying(false));
    audio.addEventListener('error', () => {
      if (audio === this.audio) {
        this.fail();
      }
    });
    return audio;
  }

  /**
   * Back to the play icon with a toast, once per tap: the error event and the refused play both land here.
   */
  private fail(): void {
    if (!this.playing()) {
      return;
    }
    this.setPlaying(false);
    this.toasts.show(PLAYBACK_FAILURE, 'error');
  }

  /**
   * Pauses the sound and shows the play icon.
   */
  private stop(): void {
    this.audio?.pause();
    this.setPlaying(false);
  }

  /**
   * Stops and drops the player, freeing the downloaded audio.
   */
  private release(): void {
    this.stop();
    this.audio = null;
  }

  /**
   * Updates the icon and tells the screen, only on a real change; follows the position while playing.
   */
  private setPlaying(playing: boolean): void {
    if (this.playing() === playing) {
      return;
    }
    this.playing.set(playing);
    this.playingChange.emit(playing);
    if (!playing && stopPlaying === this.stopper) {
      stopPlaying = null;
    }
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (playing) {
      this.followPosition();
    } else {
      this.positionChange.emit(0);
    }
  }

  /**
   * Reports the position once per frame until the sound stops.
   */
  private followPosition(): void {
    this.frame = requestAnimationFrame(() => {
      if (this.playing() && this.audio) {
        this.positionChange.emit(this.audio.currentTime * 1000);
        this.followPosition();
      }
    });
  }
}
