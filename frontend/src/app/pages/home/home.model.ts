import { Sentence } from '@core/sentences/sentence.model';
import { PronunciationStatus } from '@core/words/word.model';

/**
 * Tab shown by the home screen.
 */
export type HomeTab = 'words' | 'sentences';

/**
 * Status filter of the words tab; `all` shows every word.
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
   * Words per current status, best first; `null` on the sentences tab or with no word yet.
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
 * One word card of the list, ready to render.
 */
export interface WordCardView {
  /**
   * Word identifier, for the link to its page.
   */
  id: number;

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
   * Status of every stage, oldest first; empty when the word has a single stage.
   */
  stageStatuses: readonly PronunciationStatus[];

  /**
   * Whole card read as one sentence by screen readers.
   */
  ariaLabel: string;
}

/**
 * One sentence card of the list, ready to render.
 */
export interface SentenceCardView {
  /**
   * The sentence behind the card, handed to the edit sheet.
   */
  sentence: Sentence;

  /**
   * Day it was said ("14").
   */
  day: string;

  /**
   * Short month it was said ("oct").
   */
  month: string;

  /**
   * Whole card read as one sentence by screen readers.
   */
  ariaLabel: string;
}

/**
 * The sentence sheet being shown: `sentence` is `null` for a new one.
 */
export interface SentenceSheetRequest {
  /**
   * Sentence to edit, `null` to write a new one.
   */
  sentence: Sentence | null;
}

/**
 * Loading state of a list, so the template tells a slow network from an empty notebook.
 */
export type ListState = 'loading' | 'error' | 'ready';
