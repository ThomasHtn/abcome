import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MilestoneKind } from '@core/milestones/milestone.model';
import { Icon } from '@shared/icon/icon';

import { MILESTONE_ICONS } from './milestone-badge.constants';

/**
 * Round lavender badge of a milestone: its word count, or an icon for a first time. Decorative, the
 * text next to it names the milestone.
 */
@Component({
  selector: 'app-milestone-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './milestone-badge.html',
  styleUrl: './milestone-badge.scss',
  host: { 'aria-hidden': 'true' },
})
export class MilestoneBadge {
  /**
   * Kind of milestone.
   */
  public readonly kind = input.required<MilestoneKind>();

  /**
   * Words reached, `null` for a first time.
   */
  public readonly count = input<number | null>(null);

  /**
   * Icon of a first time, `null` for a word count.
   */
  protected readonly icon = computed(() => {
    const kind = this.kind();
    return kind === 'words' ? null : MILESTONE_ICONS[kind];
  });
}
