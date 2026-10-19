import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

import { todayIso } from './date.utils';

/**
 * Today in the family's zone, `yyyy-MM-dd`, read again whenever the app comes back to the screen: a home-screen
 * app can stay open overnight, and a screen kept since yesterday must still allow today.
 */
@Service()
export class Today {
  /**
   * Current day, updated on return to the screen.
   */
  private readonly day = signal(todayIso());

  /**
   * Current day, read-only.
   */
  public readonly iso = this.day.asReadonly();

  /**
   * Listens for the app coming back to the screen.
   */
  constructor() {
    inject(DOCUMENT).addEventListener('visibilitychange', () => this.day.set(todayIso()));
  }
}
