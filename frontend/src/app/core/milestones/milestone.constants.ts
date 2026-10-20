import { MilestoneKind } from './milestone.model';

/**
 * First word counts celebrated; past the last one, every `WORD_STEP_AFTER` more.
 */
export const WORD_STEPS: readonly number[] = [10, 50, 100];

/**
 * Gap between two word steps past the last of `WORD_STEPS` (150, 200...).
 */
export const WORD_STEP_AFTER = 50;

/**
 * Browser storage key of the milestones this device has already celebrated.
 */
export const SEEN_MILESTONES_STORAGE_KEY = 'littlewords.milestones.seen';

/**
 * Translation key of each milestone's name ("10 mots", "Premier « Bien dit »").
 */
export const MILESTONE_TITLES: Readonly<Record<MilestoneKind, string>> = {
  words: 'milestones.title.words',
  'first-mastered': 'milestones.title.firstMastered',
  'first-sentence': 'milestones.title.firstSentence',
};
