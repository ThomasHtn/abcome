import { TestBed } from '@angular/core/testing';

import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { Sentence } from '@core/sentences/sentence.model';
import { SentencesApi } from '@core/sentences/sentences-api';

import { SentenceSheet } from './sentence-sheet';

/**
 * A sentence already in the notebook.
 */
const SENTENCE: Sentence = { id: 4, spoken: 'papa pati', meaning: null, date: '2026-10-09' };

/**
 * A rendered sheet and how many times it asked to close.
 */
interface RenderedSheet {
  /**
   * Root element of the sheet.
   */
  element: HTMLElement;

  /**
   * Number of `closed` events so far.
   */
  closings: () => number;
}

describe('SentenceSheet', () => {
  /**
   * Stands in for the sentences API.
   */
  let api: Record<'create' | 'update' | 'remove', ReturnType<typeof vi.fn>>;

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
    api = {
      create: vi.fn().mockResolvedValue(SENTENCE),
      update: vi.fn().mockResolvedValue(SENTENCE),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: SentencesApi, useValue: api }] });
  });

  /**
   * Renders the sheet for a sentence (or a new one) and counts its closings.
   */
  function render(sentence: Sentence | null): RenderedSheet {
    const fixture = TestBed.createComponent(SentenceSheet);
    fixture.componentRef.setInput('sentence', sentence);
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => count++);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, closings: () => count };
  }

  /**
   * Waits for the pending save or deletion to settle.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  /**
   * Clicks the button whose text is `label`.
   */
  function click(element: HTMLElement, label: string): void {
    const button = [...element.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    button!.click();
    TestBed.tick();
  }

  it('saves a new sentence without meaning, celebrates and closes', async () => {
    const { element, closings } = render(null);
    expect(element.textContent).toContain('Nouvelle phrase');
    const textarea = element.querySelector('textarea')!;
    textarea.value = '  encore lolo ';
    textarea.dispatchEvent(new Event('input'));
    TestBed.tick();

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ spoken: 'encore lolo', meaning: null }),
    );
    expect(TestBed.inject(ToastQueue).current()?.text).toBe('Nouvelle phrase notée');
    expect(TestBed.inject(Celebration).burst()).not.toBeNull();
    expect(closings()).toBe(1);
  });

  it('keeps the save button off while nothing was said', () => {
    const { element } = render(null);
    const save = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(save.disabled).toBe(true);
  });

  it('asks before deleting, then deletes', async () => {
    const { element, closings } = render(SENTENCE);
    expect(element.textContent).toContain('Modifier la phrase');

    click(element, 'Supprimer cette phrase');
    expect(element.textContent).toContain('Supprimer «\u00A0papa pati\u00A0»\u00A0?');

    click(element, 'Oui, supprimer');
    await settle();

    expect(api.remove).toHaveBeenCalledWith(4);
    expect(closings()).toBe(1);
  });

  it('stays open with the message inside the sheet when the save fails', async () => {
    api.update.mockRejectedValue(new Error('offline'));
    const { element, closings } = render(SENTENCE);

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(closings()).toBe(0);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "La phrase n'a pas pu être enregistrée",
    );
    expect(TestBed.inject(ToastQueue).current()).toBeNull();
  });
});
