import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus } from '@core/words/word.model';

/**
 * A pronunciation status, never by color alone: colored dot with its glyph, plus the label as a pill
 * or as the image's accessible name. `dot` is the round marker of cards and timelines.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  /**
   * Status to show.
   */
  public readonly status = input.required<PronunciationStatus>();

  /**
   * `dot` alone (cards, timeline) or `pill` with the label written out.
   */
  public readonly variant = input<'dot' | 'pill'>('dot');

  /**
   * Dot diameter: `sm` 22 px in pills, `md` 30 px on cards, `lg` 34 px on the timeline.
   */
  public readonly size = input<'sm' | 'md' | 'lg'>('md');

  /**
   * French label of the status.
   */
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);

  /**
   * White glyph drawn on the dot.
   */
  protected readonly glyph = computed(() => `assets/status/${this.status()}.svg`);

  /**
   * Glyph size, about half the dot.
   */
  protected readonly glyphSize = computed(() => ({ sm: 14, md: 16, lg: 16 })[this.size()]);
}
