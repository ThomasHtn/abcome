import { Word, WordCategory } from '@core/words/word.model';

/**
 * What the visitor picked: a word of the notebook, or a label to create.
 */
export interface WordChoice {
  /**
   * The word as it will be shown and saved.
   */
  label: string;

  /**
   * Its category, for the caption under it; the backend sets the stored one.
   */
  category: WordCategory;

  /**
   * The notebook word when Côme already says it, `null` for a new word.
   */
  word: Word | null;
}

/**
 * One line of the suggestion list.
 */
export interface WordSuggestion extends WordChoice {
  /**
   * Start of the label up to the end of the match, written bold.
   */
  head: string;

  /**
   * Rest of the label, written muted.
   */
  tail: string;
}

/**
 * What the picker shows before anything is typed: the frequent first words, or the notebook's words.
 */
export type WordPickerEmptyState = 'frequent' | 'notebook';
