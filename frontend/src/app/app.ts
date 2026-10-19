import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

import { ServerStatus } from '@core/http/server-status';
import { Button } from '@shared/button/button';
import { CelebrationBurst } from '@shared/celebration-burst/celebration-burst';
import { Icon } from '@shared/icon/icon';
import { ToastOutlet } from '@shared/toast-outlet/toast-outlet';

/**
 * Root component: the screen column, the outage band, plus the toast and confetti every screen can
 * trigger.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastOutlet, CelebrationBurst, Button, Icon, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /**
   * Browser window, reloaded by the band's retry.
   */
  private readonly window = inject(DOCUMENT).defaultView;

  /**
   * Whether the notebook can be reached, for the outage band.
   */
  protected readonly serverStatus = inject(ServerStatus);

  /**
   * Reloads the page, like a classic web page, once the server may be back.
   */
  protected reload(): void {
    this.window?.location.reload();
  }
}
