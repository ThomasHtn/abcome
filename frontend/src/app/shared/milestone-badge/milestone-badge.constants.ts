import { MilestoneKind } from '@core/milestones/milestone.model';
import { IconName } from '@shared/icon/icon.model';

/**
 * Icon standing for a milestone that has no number: a check for the first "Bien dit", a speech
 * bubble for the first sentence.
 */
export const MILESTONE_ICONS: Readonly<Record<Exclude<MilestoneKind, 'words'>, IconName>> = {
  'first-mastered': 'check',
  'first-sentence': 'message-circle',
};
