import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MilestoneBadge } from '@shared/milestone-badge/milestone-badge';

import { MilestoneMarkerView } from '../home.model';

/**
 * A milestone in the home list: a dotted line across the list with a lavender label in its middle
 * ("10 mots, à 17 mois"), just above the card of the entry that reached it.
 */
@Component({
  selector: 'app-milestone-marker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MilestoneBadge],
  templateUrl: './milestone-marker.html',
  styleUrl: './milestone-marker.scss',
})
export class MilestoneMarker {
  /**
   * The milestone, ready to draw.
   */
  public readonly marker = input.required<MilestoneMarkerView>();
}
