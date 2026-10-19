import { translate } from '@jsverse/transloco';

import { dateFieldError } from '@shared/date-field/date-field.utils';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import { WordChoice } from '@shared/word-picker/word-picker.model';

/**
 * Lapinou's question, which moves on once a word is chosen; a word already in the notebook needs no
 * more question.
 */
export function wordNewQuestion(
  choice: WordChoice | null,
  known: boolean,
  childName: string,
): string {
  if (!choice) {
    return translate('wordNew.questionPick', { childName });
  }
  return translate(known ? 'wordNew.questionKnown' : 'wordNew.questionSpoken', { childName });
}

/**
 * Save button text while the first stage cannot be saved, naming what blocks it: the spoken form
 * first, then the day.
 */
export function saveBlocker(draft: PronunciationDraft, today: string): string {
  const spokenTyped = draft.spoken.trim() !== '';
  return translate(
    spokenTyped && dateFieldError(draft.date, today) !== null
      ? 'wordNew.blockerDate'
      : 'wordNew.blockerSpoken',
  );
}
