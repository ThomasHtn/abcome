import { Word } from '@core/words/word.model';

/**
 * Kind of step in the child's progress: a number of words reached, the first word said well, the
 * first sentence.
 */
export type MilestoneKind = 'words' | 'first-mastered' | 'first-sentence';

/**
 * A step reached, derived from the notebook, never stored: the list and the drawer both read it.
 */
export interface Milestone {
  /**
   * Stable name ("words-10", "first-mastered"), remembered once celebrated on a device.
   */
  key: string;

  /**
   * Kind of step.
   */
  kind: MilestoneKind;

  /**
   * Words reached, for a `words` step; `null` otherwise.
   */
  count: number | null;

  /**
   * The entry that reached it: the 10th word, the first word said well, the first sentence.
   */
  entry: Word;

  /**
   * Day it was reached, `yyyy-MM-dd`.
   */
  date: string;
}

/**
 * What the drawer says, split around the entry so its label can be styled apart.
 */
export interface MilestoneStory {
  /**
   * Text before the entry ("Avec ").
   */
  before: string;

  /**
   * The entry, quoted ("« non »").
   */
  entry: string;

  /**
   * Text after it (", Côme passe le cap des 10 mots, à 17 mois.").
   */
  after: string;
}
