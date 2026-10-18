import { dateFieldError } from '@shared/date-field/date-field.utils';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import { WordChoice } from '@shared/word-picker/word-picker.model';

/**
 * Lapinou's question, which moves on once a word is chosen; a word already in the notebook needs no
 * more question.
 */
export function wordNewQuestion(choice: WordChoice | null, known: boolean): string {
  if (!choice) {
    return 'Quel mot Côme a-t-il dit ?';
  }
  return known ? 'Côme le dit déjà !' : "Super ! Et comment Côme l'a dit ?";
}

/**
 * Save button text while the first stage cannot be saved, naming what blocks it: the spoken form
 * first, then the day.
 */
export function saveBlocker(draft: PronunciationDraft, today: string): string {
  const spokenTyped = draft.spoken.trim() !== '';
  return spokenTyped && dateFieldError(draft.date, today) !== null
    ? "Choisis d'abord le jour"
    : "Note d'abord comment il le dit";
}
