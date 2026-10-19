import { STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus, WordChange, WordKind } from '@core/words/word.model';
import { FilterChipOption } from '@shared/filter-chips/filter-chips.model';
import { IconName } from '@shared/icon/icon.model';

import { HomeTab, StatusFilter } from './home.model';

/**
 * Value of `?tab=` that opens the sentences tab.
 */
export const SENTENCES_TAB_PARAM = 'sentences';

/**
 * Query parameter holding the search, so going back to the list finds it as it was left.
 */
export const SEARCH_PARAM = 'q';

/**
 * Key of Lapinou's line while the notebook is loading or failed to load: an empty count would read
 * as an empty notebook.
 */
export const SUMMARY_PENDING_HEADLINE = 'home.summary.pendingHeadline';

/**
 * Status filters, best first; each label is a translation key, translated by the screen.
 */
export const STATUS_FILTER_OPTIONS: readonly FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'home.filterAllWords', tone: 'neutral' },
  { value: 'mastered', label: STATUS_LABELS.mastered, tone: 'mastered' },
  { value: 'almost', label: STATUS_LABELS.almost, tone: 'almost' },
  { value: 'learning', label: STATUS_LABELS.learning, tone: 'learning' },
];

/**
 * The same filters on the sentences tab, "Toutes" agreeing with "phrases".
 */
export const SENTENCE_STATUS_FILTER_OPTIONS: readonly FilterChipOption<StatusFilter>[] =
  STATUS_FILTER_OPTIONS.map((option) =>
    option.value === 'all' ? { ...option, label: 'home.filterAllSentences' } : option,
  );

/**
 * Query parameter holding the status filter, so opening a word and coming back keeps it.
 */
export const FILTER_PARAM = 'filter';

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

/**
 * Icon of the news tag for each kind of change: a sparkle for a new entry, a speech bubble for a new
 * stage, a microphone for a new sound.
 */
export const CHANGE_ICONS: Readonly<Record<WordChange, IconName>> = {
  entry: 'sparkle',
  pronunciation: 'message-circle',
  recording: 'mic',
};

/**
 * Key of what the news tag says to screen readers, agreed with the entry's kind.
 */
export const CHANGE_LABELS: Readonly<Record<WordKind, Readonly<Record<WordChange, string>>>> = {
  word: {
    entry: 'home.change.newWord',
    pronunciation: 'home.change.newPronunciation',
    recording: 'home.change.newSound',
  },
  sentence: {
    entry: 'home.change.newSentence',
    pronunciation: 'home.change.newPronunciation',
    recording: 'home.change.newSound',
  },
};

/**
 * Key of each tab's name, on its button and on the list while the search hides the tabs.
 */
export const TAB_LABELS: Readonly<Record<HomeTab, string>> = {
  words: 'home.tabWords',
  sentences: 'home.tabSentences',
};

/**
 * Key of the mascot card's headline while a tab is empty.
 */
export const SUMMARY_EMPTY_HEADLINES: Readonly<Record<WordKind, string>> = {
  word: 'home.summary.emptyWords',
  sentence: 'home.summary.emptySentences',
};

/**
 * Key of the latest entry's label in the mascot card, agreed with its noun.
 */
export const SUMMARY_LATEST_LABELS: Readonly<Record<WordKind, string>> = {
  word: 'home.summary.latestWordLabel',
  sentence: 'home.summary.latestSentenceLabel',
};
