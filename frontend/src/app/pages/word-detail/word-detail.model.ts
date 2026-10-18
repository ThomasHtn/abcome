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
   * Oldest stage: the line linking stages stops at its dot.
   */
  oldest: boolean;

  /**
   * Sounds filed under the stage, newest first.
   */
  sounds: GallerySound[];

  /**
   * Screen reader name of its sound list ("Sons de « apin »").
   */
  soundsLabel: string;
}

/**
 * One sound of a stage, ready to draw.
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
   * Day it was recorded, above its waveform ("17 oct.").
   */
  day: string;

  /**
   * Day it was recorded, in full, for the sheets and labels ("17 octobre", the year when not this one).
   */
  recordedOn: string;

  /**
   * Its length in words ("3 secondes").
   */
  length: string;

  /**
   * Screen reader name of its play button.
   */
  listenLabel: string;

  /**
   * Screen reader name of its "⋮" button.
   */
  actionsLabel: string;
}

/**
 * Wording of the page that depends on whether it shows a word or a sentence.
 */
export interface KindCopy {
  /**
   * "Supprimer le mot", "Supprimer la phrase": the noun with its article.
   */
  theNoun: string;

  /**
   * Menu entry and title of the label sheet: a word is renamed, a sentence's meaning is edited.
   */
  renameAction: string;

  /**
   * Goodbye title after the deletion, agreed with the noun ("a été supprimé", "a été supprimée").
   */
  deletedSuffix: string;

  /**
   * Title of an unknown id.
   */
  notFound: string;

  /**
   * Line shown while the notebook loads.
   */
  loading: string;

  /**
   * Toast after a rename.
   */
  renamed: string;

  /**
   * Error under an empty rename field.
   */
  emptyLabel: string;

  /**
   * Label of the rename field.
   */
  labelField: string;

  /**
   * Failure of a rename.
   */
  renameFailed: string;

  /**
   * Failure of the deletion.
   */
  deleteFailed: string;

  /**
   * Why the only stage cannot go.
   */
  lastStageMessage: string;

  /**
   * Query of the home list showing this kind, for the way back.
   */
  listQuery: Record<string, string>;
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
 * `actions` the "⋯" menu, `stage` the stage form, `remove-stage` its removal,
 * `last-stage` why the only stage cannot go, `rename` the word's label, `delete` the word's deletion,
 * `sound` the actions of one sound, `move-sound` the stage it moves to, `remove-sound` its deletion.
 */
export type WordSheet =
  | 'actions'
  | 'stage'
  | 'remove-stage'
  | 'last-stage'
  | 'rename'
  | 'delete'
  | 'sound'
  | 'move-sound'
  | 'remove-sound';

/**
 * Wording of the actions sheet of one sound.
 */
export interface SoundSheetCopy {
  /**
   * Title naming the sound by its day ("Son enregistré le 17 octobre 2026").
   */
  heading: string;

  /**
   * What is heard on it and how long it lasts ("Côme y dit « apin ». Il dure 3 secondes.").
   */
  text: string;
}
