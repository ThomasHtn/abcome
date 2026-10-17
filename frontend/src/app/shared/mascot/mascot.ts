import { NgOptimizedImage } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { MASCOT_ALT, MASCOT_ASPECT_RATIO, MASCOT_JUMP_MS } from './mascot.constants';
import { MascotState } from './mascot.model';

/**
 * Lapinou, shown as one animated SVG asset per state; never drawn in a template.
 * When `tappable`, a tap makes it jump once then return to `state` ("Faire coucou à Lapinou").
 */
@Component({
  selector: 'app-mascot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './mascot.html',
  styleUrl: './mascot.scss',
})
export class Mascot {
  /**
   * Timer ending a tap jump.
   */
  private jumpTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Number of tap jumps so far; each one recreates the image, the only way to replay an SVG animation.
   */
  private readonly jumps = signal(0);

  /**
   * Whether a tap jump is playing over `state`.
   */
  private readonly jumping = signal(false);

  /**
   * State asked by the screen ("hiding" while a password is typed, "jump" on success).
   */
  public readonly state = input<MascotState>('idle');

  /**
   * Width in pixels; the height follows the asset's 4:5 frame.
   */
  public readonly size = input(104);

  /**
   * Turns the mascot into a button that jumps when tapped.
   */
  public readonly tappable = input(false, { transform: booleanAttribute });

  /**
   * Alternative text; empty when the text next to the mascot already says it all.
   */
  public readonly alt = input<string | null>(null);

  /**
   * Loads the asset first; for the screen where Lapinou is the largest image (its LCP).
   */
  public readonly priority = input(false, { transform: booleanAttribute });

  /**
   * State actually drawn: a tap jump wins over the screen's state.
   */
  protected readonly shown = computed<MascotState>(() => (this.jumping() ? 'jump' : this.state()));

  /**
   * One-item list keyed by state and jump count, so `@for` recreates the image and the animation
   * restarts; tracked by its `key`, as tracking by identity would warn about the recreation.
   */
  protected readonly frames = computed(() => [{ key: `${this.shown()}-${this.jumps()}` }]);

  /**
   * Asset of the drawn state.
   */
  protected readonly source = computed(() => `assets/mascot/${this.shown()}.svg`);

  /**
   * Height in pixels, from the width.
   */
  protected readonly height = computed(() => Math.round(this.size() * MASCOT_ASPECT_RATIO));

  /**
   * Alternative text of the drawn state, unless the screen gave its own.
   */
  protected readonly description = computed(() => this.alt() ?? MASCOT_ALT[this.shown()]);

  /**
   * Cancels a running jump timer when the mascot goes away.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.jumpTimer));
  }

  /**
   * Plays one jump, restarting it if the previous one is still running.
   */
  protected jump(): void {
    clearTimeout(this.jumpTimer);
    this.jumping.set(true);
    this.jumps.update((count) => count + 1);
    this.jumpTimer = setTimeout(() => this.jumping.set(false), MASCOT_JUMP_MS);
  }
}
