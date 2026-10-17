import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { Sentence } from '@core/sentences/sentence.model';
import { aPronunciation, aWord } from '@core/words/word.fixtures';

import { HomePage } from './home';

/**
 * Two words: "lapin" (almost) and "chat" (learning).
 */
const WORDS = [
  aWord({ id: 1, label: 'lapin' }),
  aWord({
    id: 2,
    label: 'chat',
    pronunciations: [
      aPronunciation({ id: 20, wordId: 2, spoken: 'ka', status: 'learning', date: '2026-09-25' }),
    ],
  }),
];

/**
 * One sentence.
 */
const SENTENCES: Sentence[] = [
  { id: 1, spoken: 'a pu ato', meaning: "Il n'y a plus de gâteau", date: '2026-10-14' },
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
  });

  afterEach(() => http.verify());

  /**
   * Renders the home screen on a tab and serves both lists.
   */
  async function render(onglet?: string): Promise<ComponentFixture<HomePage>> {
    const fixture = TestBed.createComponent(HomePage);
    if (onglet) {
      fixture.componentRef.setInput('onglet', onglet);
    }
    fixture.detectChanges();
    http.expectOne(API_ENDPOINTS.words).flush(WORDS);
    http.expectOne(API_ENDPOINTS.sentences).flush(SENTENCES);
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
   * Types a search.
   */
  function search(fixture: ComponentFixture<HomePage>, query: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('lists the words with the summary of the notebook', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Les mots de Côme');
    expect(text(fixture)).toContain('Côme a déjà dit 2 mots !');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(2);
  });

  it('searches the spoken forms and offers to add a missing word', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    search(fixture, 'ka');
    expect(element.querySelectorAll('app-word-card')).toHaveLength(1);

    search(fixture, 'chien');
    expect(text(fixture)).toContain("Côme n'a pas encore dit «\u00A0chien\u00A0».");
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

  it('shows the sentences tab from the URL and opens the sheet to add one', async () => {
    const fixture = await render('phrases');
    const element = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Les phrases de Côme');
    expect(element.querySelectorAll('app-sentence-card')).toHaveLength(1);
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
      expect.objectContaining({ queryParams: { onglet: 'phrases' } }),
    );
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
