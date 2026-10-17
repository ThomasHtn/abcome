import { WordCategory } from '@core/words/word.model';

/**
 * A common first word of the built-in dictionary.
 */
export interface DictionaryEntry {
  /**
   * The word ("lapin").
   */
  label: string;

  /**
   * Its IFDC category; never `custom`.
   */
  category: WordCategory;

  /**
   * Whether it is offered as a shortcut under "Mots fréquents à cet âge".
   */
  frequent: boolean;
}
