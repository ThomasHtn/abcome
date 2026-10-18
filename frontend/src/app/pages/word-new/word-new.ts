import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DictionaryEntry } from '@core/dictionary/dictionary.model';
import { DictionaryApi } from '@core/dictionary/dictionary-api';
import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { apiErrorCode } from '@core/http/api-error.utils';
import { resourceValue } from '@core/http/resource.utils';
import { quote } from '@core/text/text.utils';
import { CATEGORY_LABELS } from '@core/words/word.constants';
import { Word } from '@core/words/word.model';
import { currentStatus, findWordByLabel } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { MascotBubble } from '@shared/mascot-bubble/mascot-bubble';
import { PageHeader } from '@shared/page-header/page-header';
import { PronunciationForm } from '@shared/pronunciation-form/pronunciation-form';
import { PronunciationDraft } from '@shared/pronunciation-form/pronunciation-form.model';
import {
  emptyDraft,
  isDraftReady,
  toPronunciationRequest,
} from '@shared/pronunciation-form/pronunciation-form.utils';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { WordPicker } from '@shared/word-picker/word-picker';
import { WordChoice } from '@shared/word-picker/word-picker.model';

import { CATEGORY_ICONS } from './word-new.constants';
import { wordNewQuestion } from './word-new.utils';

/**
 * Add-word screen: find the word in the dictionary (or type a new one), note how Côme said it and
 * when, then open its page. A word Côme already says leads to its page instead of a duplicate.
 */
@Component({
  selector: 'app-word-new-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuotePipe,
    RouterLink,
    PageHeader,
    MascotBubble,
    WordPicker,
    PronunciationForm,
    ActionBar,
    Button,
    Icon,
  ],
  templateUrl: './word-new.html',
  styleUrl: './word-new.scss',
})
export class WordNewPage {
  /**
   * Notebook words and the creation call.
   */
  private readonly wordsApi = inject(WordsApi);

  /**
   * Built-in dictionary for the search.
   */
  private readonly dictionaryApi = inject(DictionaryApi);

  /**
   * Opens the new word's page once saved.
   */
  private readonly router = inject(Router);

  /**
   * Confirms the save or reports a failure.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Confetti for a word said right from the start.
   */
  private readonly celebration = inject(Celebration);

  /**
   * `?mot=` query parameter, prefilling the search (home's "Ajouter « x » à ses mots").
   */
  public readonly mot = input<string>();

  /**
   * Typed search, prefilled from the URL.
   */
  protected readonly query = linkedSignal(() => this.mot() ?? '');

  /**
   * The notebook's words.
   */
  protected readonly words = computed<readonly Word[]>(
    () => resourceValue(this.wordsApi.words, []) ?? [],
  );

  /**
   * The dictionary entries.
   */
  protected readonly entries = computed<readonly DictionaryEntry[]>(
    () => resourceValue(this.dictionaryApi.entries, []) ?? [],
  );

  /**
   * Chosen word, `null` while searching.
   */
  protected readonly choice = signal<WordChoice | null>(null);

  /**
   * First stage being typed.
   */
  protected readonly draft = signal<PronunciationDraft>(emptyDraft());

  /**
   * Whether the creation call is running, so it is never sent twice.
   */
  protected readonly saving = signal(false);

  /**
   * Notebook word matching the choice, also found by label after a duplicate refusal.
   */
  protected readonly existing = computed(() => {
    const choice = this.choice();
    return choice ? (choice.word ?? findWordByLabel(this.words(), choice.label) ?? null) : null;
  });

  /**
   * Whether the word can be saved.
   */
  protected readonly ready = computed(
    () => this.choice() !== null && this.existing() === null && isDraftReady(this.draft()),
  );

  /**
   * Lapinou's question.
   */
  protected readonly question = computed(() => wordNewQuestion(this.choice()));

  /**
   * French category names.
   */
  protected readonly categoryLabels = CATEGORY_LABELS;

  /**
   * Icon of each category, on the chosen word's tile.
   */
  protected readonly categoryIcons = CATEGORY_ICONS;

  /**
   * Takes the picked word and starts a fresh first stage.
   */
  protected choose(choice: WordChoice): void {
    this.choice.set(choice);
    this.draft.set(emptyDraft());
  }

  /**
   * Back to the search, the typed text kept.
   */
  protected change(): void {
    this.choice.set(null);
  }

  /**
   * Creates the word with its first stage, then opens its page.
   */
  protected async save(): Promise<void> {
    const choice = this.choice();
    if (!choice || !this.ready() || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const word = await this.wordsApi.create({
        label: choice.label.trim(),
        pronunciation: toPronunciationRequest(this.draft()),
      });
      if (currentStatus(word) === 'mastered') {
        this.celebration.play();
      }
      this.toasts.show(`${quote(word.label)} rejoint ses mots`);
      await this.router.navigate(['/mots', word.id]);
    } catch (error) {
      this.reportFailure(error, choice.label);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Explains a refused save; a duplicate reloads the list so the page offers the existing word.
   */
  private reportFailure(error: unknown, label: string): void {
    if (apiErrorCode(error) === 'WORD_ALREADY_EXISTS') {
      this.wordsApi.words.reload();
      this.toasts.show(`${quote(label)} est déjà dans ses mots`, 'error');
    } else {
      this.toasts.show("Le mot n'a pas pu être enregistré, réessaie.", 'error');
    }
  }
}
