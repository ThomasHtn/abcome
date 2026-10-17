import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

import { CELEBRATION_DURATION_MS, REDUCED_MOTION_QUERY } from './feedback.constants';

/**
 * Confetti trigger ("Fête"): a word turning mastered, a sentence or a sound added.
 * Any screen calls `play()`; the burst itself is drawn once by the app shell.
 */
@Service()
export class Celebration {
  /**
   * Browser window, asked whether the visitor wants less motion.
   */
  private readonly window = inject(DOCUMENT).defaultView;

  /**
   * Timer ending the current burst.
   */
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Id of the running burst, `null` when none; a new id restarts the animation.
   */
  public readonly burst = signal<number | null>(null);

  /**
   * Starts a confetti burst, restarting it if one is running; nothing at all for a visitor who asked
   * for reduced motion (the SVG's own media query is not honoured in every browser).
   */
  public play(): void {
    if (this.window?.matchMedia?.(REDUCED_MOTION_QUERY).matches) {
      return;
    }
    clearTimeout(this.timer);
    this.burst.set((this.burst() ?? 0) + 1);
    this.timer = setTimeout(() => this.burst.set(null), CELEBRATION_DURATION_MS);
  }
}
