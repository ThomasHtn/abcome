import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { translate } from '@jsverse/transloco';

import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';

/**
 * Screen header: optional back link, the page title, and an optional action on the right
 * (projected with the `headerAction` attribute, e.g. a delete button).
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, IconButton],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  /**
   * Page title, the screen's only `<h1>`.
   */
  public readonly heading = input.required<string>();

  /**
   * Where the back link goes; no link when `null`.
   */
  public readonly backLink = input<string | null>(null);

  /**
   * Screen reader name of the back link; "Retour à l'accueil" when not given.
   */
  public readonly backLabel = input<string>();

  /**
   * Back link name as read aloud.
   */
  protected readonly shownBackLabel = computed(
    () => this.backLabel() ?? translate('pageHeader.back'),
  );
}
