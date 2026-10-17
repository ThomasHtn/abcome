import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { Icon } from '@shared/icon/icon';

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
   * Player of the current source, created on first play.
   */
  private audio: HTMLAudioElement | null = null;

  /**
   * Audio to play: `API_ENDPOINTS.recording(id)` or an object URL.
   */
  public readonly src = input.required<string>();

  /**
   * Screen reader name while stopped ("Écouter le son de « apin »").
   */
  public readonly label = input.required<string>();

  /**
   * `md` 52 px in lists, `lg` 112 px as the recorder's main control.
   */
  public readonly size = input<'md' | 'lg'>('md');

  /**
   * Emitted when playback starts or stops, so a screen can animate a waveform.
   */
  public readonly playingChange = output<boolean>();

  /**
   * Whether the sound is playing.
   */
  protected readonly playing = signal(false);

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
   * Plays from the start, or stops when already playing.
   */
  protected async toggle(): Promise<void> {
    if (this.playing()) {
      this.stop();
      return;
    }
    this.audio ??= this.createPlayer();
    this.audio.currentTime = 0;
    this.setPlaying(true);
    try {
      await this.audio.play();
    } catch {
      // Unplayable source or autoplay refusal: back to the play icon rather than a stuck stop icon.
      this.setPlaying(false);
    }
  }

  /**
   * Player wired to come back to "play" at the end of the sound.
   */
  private createPlayer(): HTMLAudioElement {
    const audio = new Audio(this.src());
    audio.addEventListener('ended', () => this.setPlaying(false));
    return audio;
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
   * Updates the icon and tells the screen, only on a real change.
   */
  private setPlaying(playing: boolean): void {
    if (this.playing() !== playing) {
      this.playing.set(playing);
      this.playingChange.emit(playing);
    }
  }
}
