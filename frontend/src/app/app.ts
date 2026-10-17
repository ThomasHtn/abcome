import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CelebrationBurst } from '@shared/celebration-burst/celebration-burst';
import { ToastOutlet } from '@shared/toast-outlet/toast-outlet';

/**
 * Root component: the screen column, plus the toast and confetti every screen can trigger.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastOutlet, CelebrationBurst],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
