import { STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus } from '@core/words/word.model';
import { FilterChipOption } from '@shared/filter-chips/filter-chips.model';

import { StatusFilter } from './home.model';

/**
 * Value of `?onglet=` that opens the sentences tab.
 */
export const SENTENCES_TAB_PARAM = 'phrases';

/**
 * Query parameter holding the search, so going back to the list finds it as it was left.
 */
export const SEARCH_PARAM = 'q';

/**
 * Lapinou's line while the notebook is loading or failed to load: an empty count would read as an
 * empty notebook.
 */
export const SUMMARY_PENDING_HEADLINE = 'Coucou\u00A0!';

/**
 * Status filters, best first, as in the mockup.
 */
export const STATUS_FILTER_OPTIONS: readonly FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'Tous', tone: 'neutral' },
  { value: 'mastered', label: STATUS_LABELS.mastered, tone: 'mastered' },
  { value: 'almost', label: STATUS_LABELS.almost, tone: 'almost' },
  { value: 'learning', label: STATUS_LABELS.learning, tone: 'learning' },
];

/**
 * The same filters on the sentences tab, "Toutes" agreeing with "phrases".
 */
export const SENTENCE_STATUS_FILTER_OPTIONS: readonly FilterChipOption<StatusFilter>[] =
  STATUS_FILTER_OPTIONS.map((option) =>
    option.value === 'all' ? { ...option, label: 'Toutes' } : option,
  );

/**
 * Query parameter holding the status filter, so opening a word and coming back keeps it.
 */
export const FILTER_PARAM = 'filtre';

/**
 * Value of `?filtre=` for each status, readable in the address bar.
 */
export const FILTER_PARAM_VALUES: Readonly<Record<PronunciationStatus, string>> = {
  mastered: 'bien-dit',
  almost: 'presque',
  learning: 'en-route',
};

/**
 * Order of the status counts in the mascot card, best first.
 */
export const SUMMARY_STATUS_ORDER: readonly PronunciationStatus[] = [
  'mastered',
  'almost',
  'learning',
];

/**
 * Cards past this index pop in together, so a long list never waits for its stagger.
 */
export const CARD_STAGGER_LIMIT = 10;
