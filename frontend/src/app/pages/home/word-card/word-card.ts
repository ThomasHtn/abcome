import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

import { AuthSession } from '@core/auth/auth-session';
import { Icon } from '@shared/icon/icon';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { StatusDot } from '@shared/status-dot/status-dot';

import { DateTile } from '../date-tile/date-tile';
import { CARD_STAGGER_LIMIT, CHANGE_ICONS } from '../home.constants';
import { WordCardView } from '../home.model';

/**
 * One word of the home list: first date, the word, what changed lately, what the child says now and
 * the current status.
 */
@Component({
  selector: 'app-word-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, QuotePipe, RouterLink, StatusDot, DateTile, TranslocoPipe],
  templateUrl: './word-card.html',
  styleUrl: './word-card.scss',
})
export class WordCard {
  /**
   * The word, ready to render.
   */
  public readonly card = input.required<WordCardView>();

  /**
   * Position in the list, which staggers the pop-in.
   */
  public readonly index = input(0);

  /**
   * Stagger step, capped so the end of a long list does not lag.
   */
  protected readonly stagger = computed(() => Math.min(this.index(), CARD_STAGGER_LIMIT));

  /**
   * Icon of the news tag for each kind of change.
   */
  protected readonly changeIcons = CHANGE_ICONS;

  /**
   * First name of the child, given by the server with the session.
   */
  protected readonly childName = inject(AuthSession).childName;
}
