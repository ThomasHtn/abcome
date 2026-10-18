import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PronunciationStatus } from '@core/words/word.model';

/**
 * Small round dot in a status color, the one status marker of every screen; decorative, so its
 * surroundings must name the status for screen readers.
 * Usage: `<app-status-dot [status]="word.status" size="sm" />`.
 */
@Component({
  selector: 'app-status-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-dot.html',
  styleUrl: './status-dot.scss',
  host: {
    'aria-hidden': 'true',
    '[class.status-dot--sm]': "size() === 'sm'",
    '[class.status-dot--learning]': "status() === 'learning'",
    '[class.status-dot--almost]': "status() === 'almost'",
    '[class.status-dot--mastered]': "status() === 'mastered'",
  },
})
export class StatusDot {
  /**
   * Status drawn; `null` draws a neutral grey dot, before a status is chosen.
   */
  public readonly status = input<PronunciationStatus | null>(null);

  /**
   * `sm` 8 px beside a line of text (progress dots), `md` 12 px as a marker of its own.
   */
  public readonly size = input<'sm' | 'md'>('md');
}
