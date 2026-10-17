import { Pronunciation, Recording } from '@core/words/word.model';

/**
 * One stage of the timeline, ready to draw.
 */
export interface TimelineStage {
  /**
   * The stage itself.
   */
  pronunciation: Pronunciation;

  /**
   * "Première fois", "Étape 2", "Aujourd'hui"...
   */
  title: string;

  /**
   * Line above the spoken form ("Première fois · 16 sept. 2026").
   */
  caption: string;

  /**
   * Screen reader name of the stage's button, saying what a tap does.
   */
  ariaLabel: string;

  /**
   * Newest stage: drawn bigger, at the top.
   */
  latest: boolean;

  /**
   * Oldest stage: the line linking stages stops above it.
   */
  oldest: boolean;
}

/**
 * One sound of the gallery, ready to draw.
 */
export interface GallerySound {
  /**
   * The sound itself.
   */
  recording: Recording;

  /**
   * URL of its audio.
   */
  src: string;

  /**
   * Visible line: day it was recorded and its length ("17 oct. · 0:03").
   */
  caption: string;

  /**
   * Its day and length in words, for labels and confirmations ("du 17 octobre 2026 (0:03)").
   */
  description: string;

  /**
   * Screen reader name of its play button.
   */
  listenLabel: string;

  /**
   * Screen reader name of its delete button.
   */
  deleteLabel: string;
}

/**
 * Size of the hero title for the label's length: long words get a smaller one.
 */
export type TitleLength = 'normal' | 'long' | 'very-long';

/**
 * What a not-found answer means for a write: the word is gone, or only one of its stages or sounds.
 */
export type MissingTarget = 'word' | 'stage' | 'sound';

/**
 * Which bottom sheet is open on the word page.
 * `actions` the "⋯" menu, `choose` the stage list, `stage` the stage form, `remove-stage` its removal,
 * `last-stage` why the only stage cannot go, `rename` the word's label, `delete` the word's deletion,
 * `remove-sound` the deletion of one sound.
 */
export type WordSheet =
  | 'actions'
  | 'choose'
  | 'stage'
  | 'remove-stage'
  | 'last-stage'
  | 'rename'
  | 'delete'
  | 'remove-sound';
