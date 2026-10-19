import { computed, effect, inject, Service, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { translate } from '@jsverse/transloco';

import { TITLE_SEPARATOR } from './branding.constants';
import { BrandingApi } from './branding-api';

/**
 * Browser tab title: the route's translated title followed by the app name, which arrives from the server
 * after the first navigation.
 */
@Service()
export class BrandedTitleStrategy extends TitleStrategy {
  /**
   * Writes the document title.
   */
  private readonly title = inject(Title);

  /**
   * Name of the app, set per deployment.
   */
  private readonly appName = inject(BrandingApi).name;

  /**
   * Title of the current route, `undefined` on a route without one.
   */
  private readonly pageTitle = signal<string | undefined>(undefined);

  /**
   * Page and app name joined, either one alone when the other is missing.
   */
  private readonly fullTitle = computed(() =>
    [this.pageTitle(), this.appName()].filter(Boolean).join(TITLE_SEPARATOR),
  );

  /**
   * Rewrites the title whenever the page or the app name changes.
   */
  constructor() {
    super();
    effect(() => this.title.setTitle(this.fullTitle()));
  }

  /**
   * Keeps the title of the route just reached, given as a translation key.
   */
  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    this.pageTitle.set(key === undefined ? undefined : translate(key));
  }
}
