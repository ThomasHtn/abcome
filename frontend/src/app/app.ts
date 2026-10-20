import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';
import { first } from 'rxjs';

import { ServerStatus } from '@core/http/server-status';
import { hideSplash } from '@core/startup/splash.utils';
import { Button } from '@shared/button/button';
import { CelebrationBurst } from '@shared/celebration-burst/celebration-burst';
import { Icon } from '@shared/icon/icon';
import { MilestoneSheet } from '@shared/milestone-sheet/milestone-sheet';
import { ToastOutlet } from '@shared/toast-outlet/toast-outlet';

/**
 * Root component: the screen column, the outage band, plus the toast and confetti every screen can
 * trigger, and the milestone drawer. It fades out the start-up screen of `index.html` once the first screen is settled.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    ToastOutlet,
    CelebrationBurst,
    MilestoneSheet,
    Button,
    Icon,
    TranslocoPipe,
  ],
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
   * Hides the start-up screen when the first navigation settles, shown, redirected or failed alike, so
   * it never stays over a screen; starts sending the sounds kept on this device, loaded apart so the
   * first screen does not wait for the notebook code.
   */
  constructor() {
    const injector = inject(Injector);
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));
    void import('@core/outbox/sound-outbox').then(({ SoundOutbox }) => {
      if (!destroyed) {
        injector.get(SoundOutbox);
      }
    });
    const document = inject(DOCUMENT);
    inject(Router)
      .events.pipe(
        first(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
      )
      .subscribe(() => hideSplash(document));
  }

  /**
   * Reloads the page, like a classic web page, once the server may be back.
   */
  protected reload(): void {
    this.window?.location.reload();
  }
}
