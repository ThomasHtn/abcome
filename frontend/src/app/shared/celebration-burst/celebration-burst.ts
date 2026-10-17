import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Celebration } from '@core/feedback/celebration';

/**
 * Confetti burst over the screen, mounted once by the app shell; screens call `Celebration.play()`.
 * The animation lives in `assets/celebration/confetti.svg`, recreated per burst so it replays.
 */
@Component({
  selector: 'app-celebration-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './celebration-burst.html',
  styleUrl: './celebration-burst.scss',
})
export class CelebrationBurst {
  /**
   * Running burst, if any.
   */
  protected readonly celebration = inject(Celebration);
}
