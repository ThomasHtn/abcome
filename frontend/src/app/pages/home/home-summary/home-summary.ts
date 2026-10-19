import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { AuthSession } from '@core/auth/auth-session';
import { Mascot } from '@shared/mascot/mascot';

import { HomeSummary } from '../home.model';

/**
 * Salmon card at the top of the home screen: Lapinou and a speech bubble about the notebook.
 */
@Component({
  selector: 'app-home-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Mascot, TranslocoPipe],
  templateUrl: './home-summary.html',
  styleUrl: './home-summary.scss',
})
export class HomeSummaryCard {
  /**
   * What to say about the open tab.
   */
  public readonly summary = input.required<HomeSummary>();

  /**
   * First name of the child, given by the server with the session.
   */
  protected readonly childName = inject(AuthSession).childName;
}
