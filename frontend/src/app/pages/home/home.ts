import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LOGIN_ROUTE } from '@core/auth/auth.constants';
import { AuthSession } from '@core/auth/auth-session';
import { resourceValue } from '@core/http/resource.utils';
import { Word } from '@core/words/word.model';
import { entriesOfKind } from '@core/words/word.utils';
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
import { HomeTab, ListState, StatusFilter } from './home.model';
import {
  emptySentencesMessage,
  emptyWordsMessage,
  groupByMonth,
  listState,
  sentencesSummary,
  tabFromParam,
  visibleWords,
  wordsSummary,
} from './home.utils';
import { HomeSummaryCard } from './home-summary/home-summary';
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
   * Schedules the focus move back to the magnifier once the tabs are rendered again.
   */
  private readonly injector = inject(Injector);

  /**
   * Words tab button, focused when the arrow keys switch tab; absent while the search is open.
   */
  private readonly wordsTab = viewChild<ElementRef<HTMLButtonElement>>('wordsTab');

  /**
   * Sentences tab button, focused when the arrow keys switch tab; absent while the search is open.
   */
  private readonly sentencesTab = viewChild<ElementRef<HTMLButtonElement>>('sentencesTab');

  /**
   * Magnifier opening the search, focused again when the search closes.
   */
  private readonly searchToggle = viewChild('searchToggle', {
    read: ElementRef<HTMLButtonElement>,
  });

  /**
   * Shared words and sentences of the notebook.
   */
  protected readonly wordsApi = inject(WordsApi);

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
   * Whether the search was opened with the magnifier or by typing.
   */
  protected readonly searchOpen = signal(false);

  /**
   * Search field shown in place of the tabs, also when the URL brings a search back.
   */
  protected readonly searchShown = computed(() => this.searchOpen() || this.query() !== '');

  /**
   * What the search looks for on the open tab, as placeholder and accessible name.
   */
  protected readonly searchLabel = computed(() =>
    this.tab() === 'words' ? 'Chercher un mot de Côme' : 'Chercher une phrase',
  );

  /**
   * Status filter of the open tab, kept across tabs.
   */
  protected readonly filter = signal<StatusFilter>('all');

  /**
   * Status filter chips.
   */
  protected readonly filterOptions = STATUS_FILTER_OPTIONS;

  /**
   * Every word and sentence, empty until loaded.
   */
  private readonly entries = computed<readonly Word[]>(
    () => resourceValue(this.wordsApi.words, null) ?? [],
  );

  /**
   * Every word.
   */
  protected readonly words = computed(() => entriesOfKind(this.entries(), 'word'));

  /**
   * Every sentence.
   */
  protected readonly sentences = computed(() => entriesOfKind(this.entries(), 'sentence'));

  /**
   * Mascot card for the open tab.
   */
  protected readonly summary = computed(() =>
    this.tab() === 'words' ? wordsSummary(this.words()) : sentencesSummary(this.sentences()),
  );

  /**
   * Word cards matching the search and filter, by month of first-said date.
   */
  protected readonly wordMonths = computed(() =>
    groupByMonth(visibleWords(this.words(), this.query(), this.filter()), 'mot'),
  );

  /**
   * Sentence cards matching the search and filter, by month of first-said date.
   */
  protected readonly sentenceMonths = computed(() =>
    groupByMonth(visibleWords(this.sentences(), this.query(), this.filter()), 'phrase'),
  );

  /**
   * Loading state of the notebook, words and sentences alike.
   */
  protected readonly openListState = computed<ListState>(() => listState(this.wordsApi.words));

  /**
   * Why the words list is empty.
   */
  protected readonly emptyWords = computed(() =>
    emptyWordsMessage(this.query(), this.filter(), this.words().length),
  );

  /**
   * Why the sentences list is empty.
   */
  protected readonly emptySentences = computed(() =>
    emptySentencesMessage(this.query(), this.filter(), this.sentences().length),
  );

  /**
   * Search trimmed, for the "Ajouter « q »" link.
   */
  protected readonly trimmedQuery = computed(() => this.query().trim());

  /**
   * Whether the new sentence sheet is shown.
   */
  protected readonly sentenceSheetOpen = signal(false);

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
    this.searchOpen.set(true);
    this.query.set(value);
    void this.router.navigate([], {
      queryParams: { [SEARCH_PARAM]: value === '' ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Clears and folds the search back into the magnifier, which gets the focus back.
   */
  protected closeSearch(): void {
    this.search('');
    this.searchOpen.set(false);
    afterNextRender(() => this.searchToggle()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * Arrow keys move between the two tabs, as the ARIA tabs pattern expects.
   */
  protected switchTabByKey(): void {
    const next: HomeTab = this.tab() === 'words' ? 'sentences' : 'words';
    this.selectTab(next);
    (next === 'words' ? this.wordsTab() : this.sentencesTab())?.nativeElement.focus();
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
