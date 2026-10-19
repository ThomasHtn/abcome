import { PronunciationStatus, WordChange } from '@core/words/word.model';

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
   * The latest entry and how the child says it ("renard, dit « enard »"), `null` while the tab is empty.
   */
  latest: string | null;

  /**
   * Words or sentences per current status, best first; `null` while the tab is empty.
   */
  statusCounts: readonly StatusCount[] | null;

  /**
   * Entries of the tab that changed since this device last looked ("3 nouveautés depuis ta visite"),
   * `null` when none did.
   */
  newsText: string | null;
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
   * Its page: `/words/7` for a word, `/sentences/7` for a sentence.
   */
  path: string;

  /**
   * The word itself ("lapin").
   */
  label: string;

  /**
   * How the child says it now ("apin").
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
   * What changed since this device last looked, shown as a tag after the title; `null` when nothing.
   */
  change: WordChange | null;

  /**
   * Whole card read as one sentence by screen readers.
   */
  ariaLabel: string;
}

/**
 * Loading state of a list, so the template tells a slow network from an empty notebook.
 */
export type ListState = 'loading' | 'error' | 'ready';

/**
 * Cards of one month of the list, under its title.
 */
export interface MonthGroup {
  /**
   * Month as `yyyy-MM`, to track the group.
   */
  key: string;

  /**
   * Its title ("Octobre 2026").
   */
  title: string;

  /**
   * How many entries it holds, with the noun ("5 mots").
   */
  countText: string;

  /**
   * Its cards, newest first.
   */
  cards: WordCardView[];

  /**
   * Position of its first card in the whole list, so the entrance stagger runs on across months.
   */
  offset: number;
}
