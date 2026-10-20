import { MilestoneKind } from '@core/milestones/milestone.model';
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
   * Tile at the start of the card: the child's age the first time when his birth date is known
   * ("17" over "mois"), else the day of the first time ("16" over "sept").
   */
  tile: CardTile;

  /**
   * Day of the first time after what the child says (", le 16 sept."), when the tile shows the age;
   * `null` when the tile already shows the day.
   */
  saidOn: string | null;

  /**
   * Milestones this entry reached, drawn as markers just above its card.
   */
  markers: MilestoneMarkerView[];

  /**
   * What changed since this device last looked, shown as a tag after the title; `null` when nothing.
   */
  change: WordChange | null;

  /**
   * Whether the entry keeps at least one sound, shown as a microphone after the title.
   */
  hasSound: boolean;

  /**
   * Whole card read as one sentence by screen readers.
   */
  ariaLabel: string;
}

/**
 * Number over a unit, in the tile at the start of a card.
 */
export interface CardTile {
  /**
   * Big number ("17", "16").
   */
  value: string;

  /**
   * Small word under it ("mois", "sept").
   */
  unit: string;

  /**
   * Whether it tells the child's age rather than a day, which tints it salmon.
   */
  age: boolean;
}

/**
 * A milestone marker in the list: a dotted line with a label between two cards.
 */
export interface MilestoneMarkerView {
  /**
   * Milestone key, to track the marker.
   */
  key: string;

  /**
   * Kind of milestone, which picks the badge.
   */
  kind: MilestoneKind;

  /**
   * Words reached, shown in the badge; `null` for a first time.
   */
  count: number | null;

  /**
   * Its line ("10 mots, à 17 mois").
   */
  label: string;
}

/**
 * What every card of a list needs besides its entry.
 */
export interface CardContext {
  /**
   * Birth date of the child, `null` when not set: the cards then show days instead of ages.
   */
  birthDate: string | null;

  /**
   * Today in the family's zone, so dates of this year leave the year out.
   */
  today: string;

  /**
   * Milestone markers by entry id; empty while a search or a filter is on.
   */
  markers: ReadonlyMap<number, MilestoneMarkerView[]>;
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
