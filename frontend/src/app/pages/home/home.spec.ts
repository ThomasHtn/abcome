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

  beforeAll(() => {
    // jsdom has no modal dialogs: stand in with the `open` attribute.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

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
   * Renders the home screen on a tab, with a search from the URL, and serves the notebook.
   */
  async function render(onglet?: string, q?: string): Promise<ComponentFixture<HomePage>> {
    const fixture = TestBed.createComponent(HomePage);
    if (onglet) {
      fixture.componentRef.setInput('onglet', onglet);
    }
    if (q) {
      fixture.componentRef.setInput('q', q);
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

    expect(text(fixture)).toContain('Les mots de Alix');
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
    const add = element.querySelector<HTMLAnchorElement>('a[href^="/mots/nouveau?mot="]')!;
    expect(add.textContent).toContain('Ajouter «\u00A0chien\u00A0» à ses mots');
  });

  it('filters on the current status', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    const learning = [...element.querySelectorAll<HTMLButtonElement>('.filter-chips__chip')].find(
      (chip) => chip.textContent?.trim() === 'En route',
    )!;
    learning.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(text(fixture)).toContain('«\u00A0ka\u00A0»');
  });

  it('keeps the status filter in the URL, so coming back from a word finds it', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    [...element.querySelectorAll<HTMLButtonElement>('.filter-chips__chip')]
      .find((chip) => chip.textContent?.trim() === 'En route')!
      .click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { filtre: 'en-route' } }),
    );

    fixture.componentRef.setInput('filtre', 'presque');
    fixture.detectChanges();
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(text(fixture)).toContain('lapin');
  });

  it('agrees the "all" filter with the sentences', async () => {
    const fixture = await render('phrases');

    expect(text(fixture)).toContain('Toutes');
    expect(text(fixture)).not.toContain('Tous');
  });

  it('shows the sentences tab from the URL, linking to their pages, and opens the sheet to add one', async () => {
    const fixture = await render('phrases');
    const element = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Les phrases de Alix');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);
    expect(element.querySelector('app-word-card a')!.getAttribute('href')).toBe('/phrases/3');
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
      expect.objectContaining({ queryParams: { onglet: 'phrases', filtre: null } }),
    );
  });

  it('stays in the notebook and says so when the logout cannot reach the server', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Se déconnecter"]')!.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('app-confirm-sheet button')]
      .find((button) => button.textContent?.trim() === 'Se déconnecter')!
      .click();
    http.expectOne(API_ENDPOINTS.logout).error(new ProgressEvent('error'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(TestBed.inject(AuthSession).signedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastQueue).current()?.tone).toBe('error');
  });

  it('logs out after confirmation and returns to the login screen', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Se déconnecter"]')!.click();
    fixture.detectChanges();
    const confirm = [
      ...element.querySelectorAll<HTMLButtonElement>('app-confirm-sheet button'),
    ].find((button) => button.textContent?.trim() === 'Se déconnecter')!;
    confirm.click();
    http.expectOne(API_ENDPOINTS.logout).flush(null, { status: 204, statusText: 'No Content' });
    await new Promise((resolve) => setTimeout(resolve));

    expect(TestBed.inject(AuthSession).signedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/connexion');
  });
});
