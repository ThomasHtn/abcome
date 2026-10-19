import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { frequentShortcuts } from '@core/dictionary/dictionary.utils';
import { CATEGORY_LABELS, LABEL_MAX_LENGTHS, STATUS_LABELS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import { currentPronunciation, sortByFirstSaidDesc } from '@core/words/word.utils';
import { Icon } from '@shared/icon/icon';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { SearchField } from '@shared/search-field/search-field';
import { StatusDot } from '@shared/status-dot/status-dot';

import { WORD_PICKER_RECENT_COUNT } from './word-picker.constants';
import { WordChoice, WordPickerEmptyState } from './word-picker.model';
import {
  buildSuggestions,
  isTooLongForWord,
  newWordOffer,
  suggestionName,
} from './word-picker.utils';

/**
 * Unique id per picker, linking its sections to their titles.
 */
let nextPickerId = 0;

/**
 * Finds a word as it is typed, in the notebook and the built-in dictionary (accents and case
 * ignored), flags the words the child already says and offers to add an unknown one.
 * Usage: `<app-word-picker searchLabel="Chercher un mot" [words]="words" [entries]="entries"
 * [(query)]="query" (picked)="choose($event)" />`.
 */
@Component({
  selector: 'app-word-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotePipe, Icon, SearchField, StatusDot, TranslocoPipe],
  templateUrl: './word-picker.html',
  styleUrl: './word-picker.scss',
})
export class WordPicker {
  /**
   * The notebook's words.
   */
  public readonly words = input.required<readonly Word[]>();

  /**
   * The built-in dictionary, in acquisition order.
   */
  public readonly entries = input.required<readonly DictionaryEntry[]>();

  /**
   * Typed text, two-way bound so a screen can prefill it.
   */
  public readonly query = model('');

  /**
   * Placeholder and accessible name of the search field.
   */
  public readonly searchLabel = input.required<string>();

  /**
   * What shows before anything is typed: frequent first words, or the notebook's recent words.
   */
  public readonly emptyState = input<WordPickerEmptyState>('frequent');

  /**
   * Emitted with the chosen word.
   */
  public readonly picked = output<WordChoice>();

  /**
   * Prefix of the section title ids.
   */
  protected readonly id = `word-picker-${nextPickerId++}`;

  /**
   * Translation keys of the category names.
   */
  protected readonly categoryLabels = CATEGORY_LABELS;

  /**
   * Translation keys of the status names, read out beside the decorative status dot.
   */
  protected readonly statusLabels = STATUS_LABELS;

  /**
   * Accessible name of a suggestion.
   */
  protected readonly suggestionName = suggestionName;

  /**
   * Whether nothing meaningful is typed.
   */
  protected readonly blank = computed(() => this.query().trim() === '');

  /**
   * Suggestions for the typed text.
   */
  protected readonly suggestions = computed(() =>
    buildSuggestions(this.entries(), this.words(), this.query()),
  );

  /**
   * Typed label to add as a new word, when nobody knows it yet.
   */
  protected readonly offer = computed(() =>
    newWordOffer(this.entries(), this.words(), this.query()),
  );

  /**
   * Whether the typed text is too long to be offered as a new word.
   */
  protected readonly tooLong = computed(() => isTooLongForWord(this.query()));

  /**
   * Longest word label, named when the typed text is too long to be offered as a new word.
   */
  protected readonly wordMaxLength = LABEL_MAX_LENGTHS.word;

  /**
   * Notebook words shown before typing, with their current spoken form; empty in `frequent` mode.
   */
  protected readonly recentWords = computed(() =>
    this.emptyState() === 'notebook'
      ? sortByFirstSaidDesc(this.words())
          .slice(0, WORD_PICKER_RECENT_COUNT)
          .map((word) => ({ word, current: currentPronunciation(word) }))
      : [],
  );

  /**
   * Frequent first words not said yet, shown before typing when there is no recent word to list.
   */
  protected readonly shortcuts = computed(() =>
    this.recentWords().length > 0 ? [] : frequentShortcuts(this.entries(), this.words()),
  );

  /**
   * Picks a notebook word.
   */
  protected pickWord(word: Word): void {
    this.picked.emit({ label: word.label, category: word.category, word });
  }

  /**
   * Picks a suggestion or a shortcut.
   */
  protected pick(choice: WordChoice): void {
    this.picked.emit({ label: choice.label, category: choice.category, word: choice.word });
  }

  /**
   * Picks a frequent first word, which the child does not say yet.
   */
  protected pickEntry(entry: DictionaryEntry): void {
    this.picked.emit({ label: entry.label, category: entry.category, word: null });
  }

  /**
   * Picks the typed text as a new word outside the dictionary.
   */
  protected pickOffer(label: string): void {
    this.picked.emit({ label, category: 'custom', word: null });
  }
}
