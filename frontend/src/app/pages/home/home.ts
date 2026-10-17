import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LOGIN_ROUTE } from '@core/auth/auth.constants';
import { AuthSession } from '@core/auth/auth-session';
import { resourceValue } from '@core/http/resource.utils';
import { Sentence } from '@core/sentences/sentence.model';
import { SentencesApi } from '@core/sentences/sentences-api';
import { Word } from '@core/words/word.model';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { Button } from '@shared/button/button';
import { ConfirmSheet } from '@shared/confirm-sheet/confirm-sheet';
import { FilterChips } from '@shared/filter-chips/filter-chips';
import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { SearchField } from '@shared/search-field/search-field';

import { SEARCH_PARAM, SENTENCES_TAB_PARAM, STATUS_FILTER_OPTIONS } from './home.constants';
import { HomeTab, ListState, SentenceSheetRequest, StatusFilter } from './home.model';
import {
  emptySentencesMessage,
  emptyWordsMessage,
  listState,
  sentencesSummary,
  tabFromParam,
  toSentenceCard,
  toWordCard,
  visibleSentences,
  visibleWords,
  wordsSummary,
} from './home.utils';
import { HomeSummaryCard } from './home-summary/home-summary';
import { SentenceCard } from './sentence-card/sentence-card';
import { SentenceSheet } from './sentence-sheet/sentence-sheet';
import { WordCard } from './word-card/word-card';

/**
 * Home screen: the words and sentences of the notebook, searched, filtered and added to.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuotePipe,
    RouterLink,
    ActionBar,
    Button,
    ConfirmSheet,
    FilterChips,
    Icon,
    IconButton,
    SearchField,
    HomeSummaryCard,
    SentenceCard,
    SentenceSheet,
    WordCard,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  /**
   * Closes the session at logout.
   */
  private readonly session = inject(AuthSession);

  /**
   * Switches tab through the URL and leaves after logout.
   */
  private readonly router = inject(Router);

  /**
   * Words tab button, focused when the arrow keys switch tab.
   */
  private readonly wordsTab = viewChild.required<ElementRef<HTMLButtonElement>>('wordsTab');

  /**
   * Sentences tab button, focused when the arrow keys switch tab.
   */
  private readonly sentencesTab = viewChild.required<ElementRef<HTMLButtonElement>>('sentencesTab');

  /**
   * Shared words of the notebook.
   */
  protected readonly wordsApi = inject(WordsApi);

  /**
   * Shared sentences of the notebook.
   */
  protected readonly sentencesApi = inject(SentencesApi);

  /**
   * `?onglet=` from the URL: `phrases` opens the sentences.
   */
  public readonly onglet = input<string>();

  /**
   * `?q=` from the URL: the search, kept there so the back button restores it.
   */
  public readonly q = input<string>();

  /**
   * Open tab.
   */
  protected readonly tab = computed<HomeTab>(() => tabFromParam(this.onglet()));

  /**
   * Search typed in the field, following `?q=`; cleared when the tab changes.
   */
  protected readonly query = linkedSignal(() => this.q() ?? '');

  /**
   * Status filter of the words tab.
   */
  protected readonly filter = signal<StatusFilter>('all');

  /**
   * Status filter chips.
   */
  protected readonly filterOptions = STATUS_FILTER_OPTIONS;

  /**
   * Every word, empty until loaded.
   */
  protected readonly words = computed<readonly Word[]>(
    () => resourceValue(this.wordsApi.words, null) ?? [],
  );

  /**
   * Every sentence, empty until loaded.
   */
  protected readonly sentences = computed<readonly Sentence[]>(
    () => resourceValue(this.sentencesApi.sentences, null) ?? [],
  );

  /**
   * Mascot card for the open tab.
   */
  protected readonly summary = computed(() =>
    this.tab() === 'words' ? wordsSummary(this.words()) : sentencesSummary(this.sentences()),
  );

  /**
   * Word cards matching the search and filter.
   */
  protected readonly wordCards = computed(() =>
    visibleWords(this.words(), this.query(), this.filter()).map(toWordCard),
  );

  /**
   * Sentence cards matching the search.
   */
  protected readonly sentenceCards = computed(() =>
    visibleSentences(this.sentences(), this.query()).map(toSentenceCard),
  );

  /**
   * Loading state of the open tab's list.
   */
  protected readonly openListState = computed<ListState>(() =>
    listState(this.tab() === 'words' ? this.wordsApi.words : this.sentencesApi.sentences),
  );

  /**
   * Why the words list is empty.
   */
  protected readonly emptyWords = computed(() =>
    emptyWordsMessage(this.query(), this.filter(), this.words().length),
  );

  /**
   * Why the sentences list is empty.
   */
  protected readonly emptySentences = computed(() => emptySentencesMessage(this.query()));

  /**
   * Search trimmed, for the "Ajouter « q »" link.
   */
  protected readonly trimmedQuery = computed(() => this.query().trim());

  /**
   * Sentence sheet being shown, `null` when closed.
   */
  protected readonly sentenceSheet = signal<SentenceSheetRequest | null>(null);

  /**
   * Whether the logout question is shown.
   */
  protected readonly logoutOpen = signal(false);

  /**
   * Logout request on its way.
   */
  protected readonly loggingOut = signal(false);

  /**
   * Opens a tab through the URL, so the back button and a reload keep it; the search restarts.
   */
  protected selectTab(tab: HomeTab): void {
    if (tab === this.tab()) {
      return;
    }
    this.query.set('');
    void this.router.navigate([], {
      queryParams: { onglet: tab === 'sentences' ? SENTENCES_TAB_PARAM : null },
      replaceUrl: true,
    });
  }

  /**
   * Filters the list as the search is typed and mirrors it in the URL, without a history entry.
   */
  protected search(value: string): void {
    this.query.set(value);
    void this.router.navigate([], {
      queryParams: { [SEARCH_PARAM]: value === '' ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Arrow keys move between the two tabs, as the ARIA tabs pattern expects.
   */
  protected switchTabByKey(): void {
    const next: HomeTab = this.tab() === 'words' ? 'sentences' : 'words';
    this.selectTab(next);
    (next === 'words' ? this.wordsTab() : this.sentencesTab()).nativeElement.focus();
  }

  /**
   * Opens the sheet for a new sentence, or to edit one.
   */
  protected openSentence(sentence: Sentence | null): void {
    this.sentenceSheet.set({ sentence });
  }

  /**
   * Closes the session and returns to the login screen.
   */
  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.session.signOut();
    } finally {
      this.loggingOut.set(false);
      this.logoutOpen.set(false);
      void this.router.navigateByUrl(LOGIN_ROUTE);
    }
  }
}
