import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { ToastQueue } from '@core/feedback/toast-queue';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { aPronunciation, aWord } from '@core/words/word.fixtures';

import { HomePage } from './home';

/**
 * Two words, "lapin" (almost) and "chat" (learning), and one sentence.
 */
const ENTRIES = [
  aWord({ id: 1, label: 'lapin' }),
  aWord({
    id: 2,
    label: 'chat',
    pronunciations: [
      aPronunciation({ id: 20, wordId: 2, spoken: 'ka', status: 'learning', date: '2026-09-25' }),
    ],
  }),
  aWord({
    id: 3,
    kind: 'sentence',
    label: "Il n'y a plus de gâteau",
    pronunciations: [
      aPronunciation({
        id: 30,
        wordId: 3,
        spoken: 'a pu ato',
        status: 'learning',
        date: '2026-10-14',
      }),
    ],
  }),
];

describe('HomePage', () => {
  /**
   * Answers the API calls.
   */
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSession).status.set('signed-in');
    TestBed.inject(AuthSession).childName.set('Alix');
  });

  afterEach(() => http.verify());

  /**
   * Renders the home screen on a tab, with a search and a filter from the URL, and serves the
   * notebook.
   */
  async function render(
    tab?: string,
    q?: string,
    filter?: string,
  ): Promise<ComponentFixture<HomePage>> {
    const fixture = TestBed.createComponent(HomePage);
    if (tab) {
      fixture.componentRef.setInput('tab', tab);
    }
    if (q) {
      fixture.componentRef.setInput('q', q);
    }
    if (filter) {
      fixture.componentRef.setInput('filter', filter);
    }
    fixture.detectChanges();
    http.expectOne(API_ENDPOINTS.words).flush(ENTRIES);
    // The resources settle on a macrotask.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Text of the screen, whitespace collapsed.
   */
  function text(fixture: ComponentFixture<HomePage>): string {
    return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/[ \t\n\r]+/g, ' ');
  }

  /**
   * The search input, `null` while folded into the magnifier.
   */
  function searchInput(fixture: ComponentFixture<HomePage>): HTMLInputElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
  }

  /**
   * Opens the search with the magnifier.
   */
  function openSearch(fixture: ComponentFixture<HomePage>): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Chercher un mot de Alix"]')!
      .click();
    fixture.detectChanges();
  }

  /**
   * The toggle folding the status filters.
   */
  function filterToggle(fixture: ComponentFixture<HomePage>): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.home__filter-toggle',
    )!;
  }

  /**
   * The status filter chips, none while folded.
   */
  function filterChips(fixture: ComponentFixture<HomePage>): HTMLButtonElement[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.filter-chips__chip',
      ),
    ];
  }

  /**
   * Unfolds the status filters with their toggle.
   */
  function openFilters(fixture: ComponentFixture<HomePage>): void {
    filterToggle(fixture).click();
    fixture.detectChanges();
  }

  /**
   * Unfolds the status filters and picks the one with this label.
   */
  function pickFilter(fixture: ComponentFixture<HomePage>, label: string): void {
    openFilters(fixture);
    filterChips(fixture)
      .find((chip) => chip.textContent?.trim() === label)!
      .click();
    fixture.detectChanges();
  }

  /**
   * Types a search, opening it first when folded.
   */
  function search(fixture: ComponentFixture<HomePage>, query: string): void {
    if (!searchInput(fixture)) {
      openSearch(fixture);
    }
    const input = searchInput(fixture)!;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('lists the words with the summary of the notebook', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Les mots de Alix',
    );
    expect(text(fixture)).toContain('Alix a déjà dit 2 mots !');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(2);
  });

  it('says the notebook did not open, with a retry, and does not call it empty', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    http
      .expectOne(API_ENDPOINTS.words)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(text(fixture)).toContain("Le carnet n'a pas pu s'ouvrir.");
    expect(text(fixture)).toContain('Coucou\u00A0!');
    expect(text(fixture)).not.toContain('premier mot');

    const retry = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Réessayer',
    );
    retry?.click();
    TestBed.tick();
    http.expectOne(API_ENDPOINTS.words).flush(ENTRIES);
  });

  it('titles the list by month, newest first, each month holding its words', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    const months = [...element.querySelectorAll('.home__month')].map((month) => [
      month.querySelector('.home__month-title')?.textContent,
      month.querySelector('.home__month-count')?.textContent,
      month.querySelectorAll('app-word-card').length,
    ]);
    expect(months).toEqual([
      ['Octobre 2026', '1 mot', 1],
      ['Septembre 2026', '1 mot', 1],
    ]);
  });

  it('folds the search into a magnifier that swaps the tabs for the field', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);

    expect(searchInput(fixture)).toBeNull();
    openSearch(fixture);
    await fixture.whenStable();

    expect(element.querySelector('[role="tablist"]')).toBeNull();
    expect(document.activeElement).toBe(searchInput(fixture));

    search(fixture, 'ka');
    element.querySelector<HTMLButtonElement>('button[aria-label="Fermer la recherche"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(searchInput(fixture)).toBeNull();
    expect(element.querySelectorAll('app-word-card')).toHaveLength(2);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Chercher un mot de Alix');
    element.remove();
  });

  it('closes the search on Escape', async () => {
    const fixture = await render();

    search(fixture, 'ka');
    searchInput(fixture)!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();

    expect(searchInput(fixture)).toBeNull();
  });

  it('opens the search kept in the URL without focusing it', async () => {
    const fixture = await render(undefined, 'ka');
    document.body.append(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();

    expect(searchInput(fixture)?.value).toBe('ka');
    expect(document.activeElement).not.toBe(searchInput(fixture));
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-word-card')).toHaveLength(
      1,
    );
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('searches the spoken forms and offers to add a missing word', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    search(fixture, 'ka');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);

    search(fixture, 'chien');
    expect(text(fixture)).toContain("Alix n'a pas encore dit «\u00A0chien\u00A0».");
    const add = element.querySelector<HTMLAnchorElement>('a[href^="/words/new?word="]')!;
    expect(add.textContent).toContain('Ajouter «\u00A0chien\u00A0» à ses mots');
  });

  it('filters on the current status', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    pickFilter(fixture, 'En route');

    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(text(fixture)).toContain('«\u00A0ka\u00A0»');
  });

  it('keeps the status filter in the URL, so coming back from a word finds it', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    pickFilter(fixture, 'En route');

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { filter: 'learning' } }),
    );

    fixture.componentRef.setInput('filter', 'almost');
    fixture.detectChanges();
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(text(fixture)).toContain('lapin');
  });

  it('folds the filters behind a toggle, which unfolds them', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    expect(filterChips(fixture)).toHaveLength(0);
    expect(filterToggle(fixture).getAttribute('aria-expanded')).toBe('false');

    openFilters(fixture);

    expect(filterChips(fixture).map((chip) => chip.textContent?.trim())).toEqual([
      'Tous',
      'Bien dit',
      'Presque',
      'En route',
    ]);
    expect(filterToggle(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('#home-filters')).not.toBeNull();
  });

  it('folds the filters once one is picked, keeping it in sight on the toggle', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);

    pickFilter(fixture, 'En route');
    await fixture.whenStable();

    expect(filterChips(fixture)).toHaveLength(0);
    expect(filterToggle(fixture).getAttribute('aria-label')).toBe(
      "Filtrer par couleur, En route pour l'instant",
    );
    expect(filterToggle(fixture).querySelector('.home__filter-badge')).not.toBeNull();
    expect(document.activeElement).toBe(filterToggle(fixture));
    element.remove();
  });

  it('shows the filter kept in the URL on the folded toggle, until every status is picked again', async () => {
    const fixture = await render(undefined, undefined, 'learning');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(filterChips(fixture)).toHaveLength(0);
    expect(filterToggle(fixture).querySelector('.home__filter-badge')).not.toBeNull();

    pickFilter(fixture, 'Tous');

    expect(element.querySelectorAll('app-word-card')).toHaveLength(2);
    expect(filterToggle(fixture).querySelector('.home__filter-badge')).toBeNull();
    expect(filterToggle(fixture).getAttribute('aria-label')).toBe('Filtrer par couleur');
  });

  it('folds the filters on Escape', async () => {
    const fixture = await render();

    openFilters(fixture);
    filterChips(fixture)[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();

    expect(filterChips(fixture)).toHaveLength(0);
  });

  it('agrees the "all" filter with the sentences', async () => {
    const fixture = await render('sentences');

    openFilters(fixture);

    expect(text(fixture)).toContain('Toutes');
    expect(text(fixture)).not.toContain('Tous');
  });

  it('shows the sentences tab from the URL, linking to their pages, and opens the sheet to add one', async () => {
    const fixture = await render('sentences');
    const element = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Les phrases de Alix');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(element.querySelector('app-word-card a')!.getAttribute('href')).toBe('/sentences/3');
    expect(text(fixture)).toContain("Il n'y a plus de gâteau");
    expect(element.querySelector('#home-tab-sentences')!.getAttribute('aria-selected')).toBe(
      'true',
    );

    const add = [...element.querySelectorAll<HTMLButtonElement>('app-action-bar button')][0];
    add.click();
    fixture.detectChanges();
    expect(element.querySelector('app-sentence-sheet')).not.toBeNull();
  });

  it('switches tab through the URL', async () => {
    const fixture = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('#home-tab-sentences')!
      .click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tab: 'sentences', filter: null } }),
    );
  });

  it('marks the first sentence in the list, but not among search results', async () => {
    const fixture = await render('sentences');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-milestone-marker')?.textContent).toMatch(
      /Première phrase, le 14 octobre/u,
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthSession).status.set('signed-in');
    const searched = await render('sentences', 'gâteau');

    expect(
      (searched.nativeElement as HTMLElement).querySelector('app-milestone-marker'),
    ).toBeNull();
  });

  it('stays in the notebook and says so when the logout cannot reach the server', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element.querySelector<HTMLButtonElement>('app-home-menu button[role="menuitem"]')!.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('app-confirm-sheet button')]
      .find((button) => button.textContent?.trim() === 'Se déconnecter')!
      .click();
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne(API_ENDPOINTS.logout).error(new ProgressEvent('error'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(TestBed.inject(AuthSession).signedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastQueue).current()?.tone).toBe('error');
  });

  it('shows a reader the notebook without any way to add to it', async () => {
    TestBed.inject(AuthSession).readOnly.set(true);
    const fixture = await render(undefined, 'girafe');
    const element = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain("Alix n'a pas encore dit");
    expect(element.querySelector('app-action-bar')).toBeNull();
    expect(element.querySelector('a[href^="/words/new"]')).toBeNull();
    expect(element.querySelector('.home--read-only')).not.toBeNull();
    expect(element.querySelector('app-home-menu')).not.toBeNull();
  });

  it('logs out after confirmation and returns to the login screen', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element.querySelector<HTMLButtonElement>('app-home-menu button[role="menuitem"]')!.click();
    fixture.detectChanges();
    const confirm = [
      ...element.querySelectorAll<HTMLButtonElement>('app-confirm-sheet button'),
    ].find((button) => button.textContent?.trim() === 'Se déconnecter')!;
    confirm.click();
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne(API_ENDPOINTS.logout).flush(null, { status: 204, statusText: 'No Content' });
    await new Promise((resolve) => setTimeout(resolve));

    expect(TestBed.inject(AuthSession).signedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
