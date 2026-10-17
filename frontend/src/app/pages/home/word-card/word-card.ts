import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { QuotePipe } from '@shared/quote/quote.pipe';
import { StatusBadge } from '@shared/status-badge/status-badge';

import { DateTile } from '../date-tile/date-tile';
import { CARD_STAGGER_LIMIT } from '../home.constants';
import { WordCardView } from '../home.model';

/**
 * One word of the home list: first date, what Côme says now, the word and its progress.
 */
@Component({
  selector: 'app-word-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, RouterLink, DateTile, StatusBadge],
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
}
