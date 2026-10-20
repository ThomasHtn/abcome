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

import { translate, TranslocoPipe } from '@jsverse/transloco';

import { LOGIN_ROUTE } from '@core/auth/auth.constants';
import { AuthSession } from '@core/auth/auth-session';
import { Today } from '@core/date/today';
import { ToastQueue } from '@core/feedback/toast-queue';
import { resourceValue } from '@core/http/resource.utils';
import { milestonesOf } from '@core/milestones/milestone.utils';
import { SeenWords } from '@core/words/seen-words';
import { STATUS_LABELS } from '@core/words/word.constants';
import { Word, WordChange } from '@core/words/word.model';
import { entriesOfKind, findWordByLabel } from '@core/words/word.utils';
import { WordsApi } from '@core/words/words-api';
import { ActionBar } from '@shared/action-bar/action-bar';
import { Button } from '@shared/button/button';
import { ConfirmSheet } from '@shared/confirm-sheet/confirm-sheet';
import { FilterChips } from '@shared/filter-chips/filter-chips';
import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';
import { QuotePipe } from '@shared/quote/quote.pipe';
import { SearchField } from '@shared/search-field/search-field';

import {
  FILTER_PARAM,
  SEARCH_PARAM,
  SENTENCE_STATUS_FILTER_OPTIONS,
  SENTENCES_TAB_PARAM,
  STATUS_FILTER_OPTIONS,
  SUMMARY_PENDING_HEADLINE,
  TAB_LABELS,
} from './home.constants';
import { CardContext, HomeTab, ListState, StatusFilter } from './home.model';
import {
  emptySentencesMessage,
  emptyWordsMessage,
  filterFromParam,
  groupByMonth,
  listState,
  markersByEntry,
  sentencesSummary,
  tabFromParam,
  visibleWords,
  wordsSummary,
} from './home.utils';
import { HomeMenu } from './home-menu/home-menu';
import { HomeSummaryCard } from './home-summary/home-summary';
import { MilestoneMarker } from './milestone-marker/milestone-marker';
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
    TranslocoPipe,
    RouterLink,
    ActionBar,
    Button,
    ConfirmSheet,
    FilterChips,
    Icon,
    IconButton,
    SearchField,
    HomeMenu,
    HomeSummaryCard,
    MilestoneMarker,
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
   * First name of the child, given by the server with the session.
   */
  protected readonly childName = this.session.childName;

  /**
   * Whether the visitor only looks: no action bar, no shortcut to add a word.
   */
  protected readonly readOnly = this.session.readOnly;

  /**
   * Switches tab through the URL and leaves after logout.
   */
  private readonly router = inject(Router);

  /**
   * Whether the screen comes back through the back button: everything is then shown in place, since
   * the cards popping in one after the other would leave the restored spot empty for a while.
   */
  protected readonly restored = this.router.currentNavigation()?.trigger === 'popstate';

  /**
   * Says when the logout failed.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * Schedules the focus moves back to the magnifier and the filter toggle once the screen is rendered
   * again.
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
   * Toggle folding the filters, focused again when they fold away under the finger or the keyboard.
   */
  private readonly filterToggle = viewChild('filterToggle', {
    read: ElementRef<HTMLButtonElement>,
  });

  /**
   * Shared words and sentences of the notebook.
   */
  protected readonly wordsApi = inject(WordsApi);

  /**
   * `?tab=` from the URL: `sentences` opens the sentences.
   */
  public readonly tab = input<string>();

  /**
   * `?q=` from the URL: the search, kept there so the back button restores it.
   */
  public readonly q = input<string>();

  /**
   * `?filter=` from the URL: the status filter, kept there so coming back from a word keeps it.
   */
  public readonly filter = input<string>();

  /**
   * Open tab.
   */
  protected readonly activeTab = computed<HomeTab>(() => tabFromParam(this.tab()));

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
    this.activeTab() === 'words'
      ? translate('home.searchWords', { childName: this.childName() })
      : translate('home.searchSentences'),
  );

  /**
   * Key of each tab's name, on its button and on the list while the search hides the tabs.
   */
  protected readonly tabLabels = TAB_LABELS;

  /**
   * Status filter, kept across tabs, following `?filter=`.
   */
  protected readonly activeFilter = linkedSignal(() => filterFromParam(this.filter()));

  /**
   * Whether the status filters are unfolded under the tabs; folded by default, so they stay quiet.
   */
  protected readonly filtersOpen = signal(false);

  /**
   * Status filtered on while the filters are folded, which the toggle shows with its tint and dot.
   */
  protected readonly foldedFilter = computed(() => {
    const filter = this.activeFilter();
    return this.filtersOpen() || filter === 'all' ? null : filter;
  });

  /**
   * Name of the filtered status, empty for every status.
   */
  protected readonly activeFilterLabel = computed(() => {
    const filter = this.activeFilter();
    return filter === 'all' ? '' : translate(STATUS_LABELS[filter]);
  });

  /**
   * Accessible name of the filter toggle, naming the filtered status since only a tint shows it.
   */
  protected readonly filterToggleLabel = computed(() =>
    this.activeFilter() === 'all'
      ? translate('home.filterLabel')
      : translate('home.filterLabelActive', { status: this.activeFilterLabel() }),
  );

  /**
   * Status filter chips, "Tous" on the words and "Toutes" on the sentences, their keys translated.
   */
  protected readonly filterOptions = computed(() =>
    (this.activeTab() === 'words' ? STATUS_FILTER_OPTIONS : SENTENCE_STATUS_FILTER_OPTIONS).map(
      (option) => ({ ...option, label: translate(option.label) }),
    ),
  );

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
   * Today in the family's zone, so the cards leave this year out of their dates.
   */
  private readonly today = inject(Today).iso;

  /**
   * What every card needs besides its entry: the child's birth date for the age tiles, and the
   * milestone markers, left out while a search or a filter is on since "10 mots" would sit among
   * cards that do not add up to it.
   */
  private readonly cardContext = computed<CardContext>(() => {
    const birthDate = this.session.childBirthDate();
    const today = this.today();
    const narrowed = this.query().trim() !== '' || this.activeFilter() !== 'all';
    return {
      birthDate,
      today,
      markers: narrowed
        ? new Map()
        : markersByEntry(milestonesOf(this.entries()), birthDate, today),
    };
  });

  /**
   * What this device has already seen, to tag the entries that changed elsewhere.
   */
  private readonly seenWords = inject(SeenWords);

  /**
   * Number of words that changed since this device last looked.
   */
  protected readonly wordNews = computed(
    () => this.words().filter((word) => this.changeOf(word) !== null).length,
  );

  /**
   * Number of sentences that changed since this device last looked.
   */
  protected readonly sentenceNews = computed(
    () => this.sentences().filter((sentence) => this.changeOf(sentence) !== null).length,
  );

  /**
   * Mascot card for the open tab; a greeting rather than "no word yet" until the list is there.
   */
  protected readonly summary = computed(() => {
    const summary =
      this.activeTab() === 'words'
        ? wordsSummary(this.words(), this.wordNews())
        : sentencesSummary(this.sentences(), this.sentenceNews());
    return this.openListState() === 'ready'
      ? summary
      : { ...summary, emptyHeadline: translate(SUMMARY_PENDING_HEADLINE) };
  });

  /**
   * Word cards matching the search and filter, by month of first-said date.
   */
  protected readonly wordMonths = computed(() =>
    groupByMonth(
      visibleWords(this.words(), this.query(), this.activeFilter()),
      'word',
      (word) => this.changeOf(word),
      this.cardContext(),
    ),
  );

  /**
   * Sentence cards matching the search and filter, by month of first-said date.
   */
  protected readonly sentenceMonths = computed(() =>
    groupByMonth(
      visibleWords(this.sentences(), this.query(), this.activeFilter()),
      'sentence',
      (sentence) => this.changeOf(sentence),
      this.cardContext(),
    ),
  );

  /**
   * Loading state of the notebook, words and sentences alike.
   */
  protected readonly openListState = computed<ListState>(() => listState(this.wordsApi.words));

  /**
   * Why the words list is empty.
   */
  protected readonly emptyWords = computed(() =>
    emptyWordsMessage(this.query(), this.activeFilter(), this.words().length, this.childName()),
  );

  /**
   * Why the sentences list is empty.
   */
  protected readonly emptySentences = computed(() =>
    emptySentencesMessage(this.query(), this.activeFilter(), this.sentences().length),
  );

  /**
   * Search trimmed, for the "Ajouter « q »" link; empty when the word is already there, hidden by
   * the color filter.
   */
  protected readonly trimmedQuery = computed(() => {
    const search = this.query().trim();
    return findWordByLabel(this.words(), search) ? '' : search;
  });

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
   * Body of the logout question: nothing is lost, but the password will be needed again.
   */
  protected readonly logoutMessage = computed(() =>
    translate('home.logoutMessage', { childName: this.childName() }),
  );

  /**
   * Opens a tab through the URL, so the back button and a reload keep it; the search restarts.
   */
  protected selectTab(tab: HomeTab): void {
    if (tab === this.activeTab()) {
      return;
    }
    this.query.set('');
    void this.router.navigate([], {
      queryParams: {
        tab: tab === 'sentences' ? SENTENCES_TAB_PARAM : null,
        [FILTER_PARAM]: this.filterParam(),
      },
      replaceUrl: true,
    });
  }

  /**
   * Filters the list and mirrors the filter in the URL, without a history entry.
   */
  protected selectFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
    void this.router.navigate([], {
      queryParams: { [FILTER_PARAM]: this.filterParam() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Filters on the chip picked, then folds the filters away, their job done.
   */
  protected pickFilter(filter: StatusFilter): void {
    this.selectFilter(filter);
    this.closeFilters();
  }

  /**
   * Folds the filters away; the toggle gets the focus back, as the chips leave with it.
   */
  protected closeFilters(): void {
    this.filtersOpen.set(false);
    afterNextRender(() => this.filterToggle()?.nativeElement.focus(), { injector: this.injector });
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
    const next: HomeTab = this.activeTab() === 'words' ? 'sentences' : 'words';
    this.selectTab(next);
    (next === 'words' ? this.wordsTab() : this.sentencesTab())?.nativeElement.focus();
  }

  /**
   * Closes the session and returns to the login screen; when the server cannot close it, stays in
   * the notebook and says so, since the session would still open it.
   */
  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.wordsApi.flushRemovals();
      await this.session.signOut();
      void this.router.navigateByUrl(LOGIN_ROUTE);
    } catch {
      this.toasts.show(translate('home.logoutFailed'), 'error');
    } finally {
      this.loggingOut.set(false);
      this.logoutOpen.set(false);
    }
  }

  /**
   * Value of `?filter=` for the current filter, `null` (no parameter) for every status.
   */
  private filterParam(): string | null {
    const filter = this.activeFilter();
    return filter === 'all' ? null : filter;
  }

  /**
   * What changed in an entry since this device last looked.
   */
  private changeOf(word: Word): WordChange | null {
    return this.seenWords.changeOf(word);
  }
}
