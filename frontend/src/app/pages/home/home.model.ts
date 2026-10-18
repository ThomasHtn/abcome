import { PronunciationStatus } from '@core/words/word.model';

/**
 * Tab shown by the home screen.
 */
export type HomeTab = 'words' | 'sentences';

/**
 * Status filter of the open tab; `all` shows every word or sentence.
 */
export type StatusFilter = 'all' | PronunciationStatus;

/**
 * What the mascot card says about the open tab.
 */
export interface HomeSummary {
  /**
   * Number of words or sentences on the open tab.
   */
  total: number;

  /**
   * Number of words or sentences, with its noun ("3 mots", "1 phrase").
   */
  countText: string;

  /**
   * Headline replacing the count while the tab is empty.
   */
  emptyHeadline: string;

  /**
   * Label of the latest item, agreed with its noun ("Dernier", "Dernière").
   */
  latestLabel: string;

  /**
   * What Côme said last, `null` while the notebook is empty.
   */
  latest: string | null;

  /**
   * Words or sentences per current status, best first; `null` while the tab is empty.
   */
  statusCounts: readonly StatusCount[] | null;
}

/**
 * Number of words currently at one status.
 */
export interface StatusCount {
  /**
   * The status counted.
   */
  status: PronunciationStatus;

  /**
   * How many words are at it now.
   */
  count: number;

  /**
   * Spoken form for screen readers ("4 Bien dit").
   */
  label: string;
}

/**
 * One word or sentence card of the list, ready to render.
 */
export interface WordCardView {
  /**
   * Entry identifier, to track the card.
   */
  id: number;

  /**
   * Its page: `/mots/7` for a word, `/phrases/7` for a sentence.
   */
  path: string;

  /**
   * The word itself ("lapin").
   */
  label: string;

  /**
   * How Côme says it now ("apin").
   */
  spoken: string;

  /**
   * Current status.
   */
  status: PronunciationStatus;

  /**
   * Day of the first time, for the date tile ("16").
   */
  day: string;

  /**
   * Short month of the first time, for the date tile ("sept").
   */
  month: string;

  /**
   * Whole card read as one sentence by screen readers.
   */
  ariaLabel: string;
}

/**
 * Loading state of a list, so the template tells a slow network from an empty notebook.
 */
export type ListState = 'loading' | 'error' | 'ready';
