import { WordChoice } from '@shared/word-picker/word-picker.model';

/**
 * Lapinou's question, which moves on once a word is chosen.
 */
export function wordNewQuestion(choice: WordChoice | null): string {
  return choice ? "Super ! Et comment Côme l'a dit ?" : 'Quel mot Côme a-t-il dit ?';
}
