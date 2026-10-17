import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Mascot } from '@shared/mascot/mascot';
import { QuotePipe } from '@shared/quote/quote.pipe';

import { HomeSummary } from '../home.model';

/**
 * Salmon card at the top of the home screen: Lapinou and a speech bubble about the notebook.
 */
@Component({
  selector: 'app-home-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, Mascot],
  templateUrl: './home-summary.html',
  styleUrl: './home-summary.scss',
})
export class HomeSummaryCard {
  /**
   * What to say about the open tab.
   */
  public readonly summary = input.required<HomeSummary>();
}
