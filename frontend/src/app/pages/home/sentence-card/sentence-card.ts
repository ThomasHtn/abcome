import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Sentence } from '@core/sentences/sentence.model';
import { QuotePipe } from '@shared/quote/quote.pipe';

import { DateTile } from '../date-tile/date-tile';
import { CARD_STAGGER_LIMIT } from '../home.constants';
import { SentenceCardView } from '../home.model';

/**
 * One sentence of the home list; a tap opens it for editing.
 */
@Component({
  selector: 'app-sentence-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, DateTile],
  templateUrl: './sentence-card.html',
  styleUrl: './sentence-card.scss',
})
export class SentenceCard {
  /**
   * The sentence, ready to render.
   */
  public readonly card = input.required<SentenceCardView>();

  /**
   * Position in the list, which staggers the pop-in.
   */
  public readonly index = input(0);

  /**
   * Asks the page to open this sentence in the edit sheet.
   */
  public readonly edit = output<Sentence>();

  /**
   * Stagger step, capped so the end of a long list does not lag.
   */
  protected readonly stagger = computed(() => Math.min(this.index(), CARD_STAGGER_LIMIT));
}
