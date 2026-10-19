import { TestBed } from '@angular/core/testing';

import { Celebration } from '@core/feedback/celebration';
import { ToastQueue } from '@core/feedback/toast-queue';
import { aWord } from '@core/words/word.fixtures';
import { WordsApi } from '@core/words/words-api';

import { SentenceSheet } from './sentence-sheet';

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
   * Stands in for the words API's creation.
   */
  let create: ReturnType<typeof vi.fn>;

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
    create = vi.fn().mockResolvedValue(aWord({ id: 4, kind: 'sentence' }));
    TestBed.configureTestingModule({ providers: [{ provide: WordsApi, useValue: { create } }] });
  });

  /**
   * Renders the sheet and counts its closings.
   */
  function render(): RenderedSheet {
    const fixture = TestBed.createComponent(SentenceSheet);
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => count++);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, closings: () => count };
  }

  /**
   * Types `value` in the field matched by `selector`.
   */
  function type(element: HTMLElement, selector: string, value: string): void {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    TestBed.tick();
  }

  /**
   * Waits for the pending save to settle.
   */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  }

  it('creates a sentence from what the child meant and said, celebrates and closes', async () => {
    const { element, closings } = render();
    type(element, 'textarea', '  Il n’y a plus de gâteau ');
    type(element, 'input[type="text"]', ' a pu ato ');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'sentence',
        label: 'Il n’y a plus de gâteau',
        pronunciation: expect.objectContaining({ spoken: 'a pu ato', status: 'learning' }),
      }),
    );
    expect(TestBed.inject(ToastQueue).current()?.text).toBe('Nouvelle phrase notée');
    expect(TestBed.inject(Celebration).burst()).not.toBeNull();
    expect(closings()).toBe(1);
  });

  it('keeps the save button off until both the meaning and the spoken form are written', () => {
    const { element } = render();
    const save = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(save.disabled).toBe(true);

    type(element, 'textarea', 'Encore');
    expect(save.disabled).toBe(true);

    type(element, 'input[type="text"]', 'ankor');
    expect(save.disabled).toBe(false);
  });

  it('stays open with the message inside the sheet when the save fails', async () => {
    create.mockRejectedValue(new Error('offline'));
    const { element, closings } = render();
    type(element, 'textarea', 'Encore');
    type(element, 'input[type="text"]', 'ankor');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(closings()).toBe(0);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      "La phrase n'a pas pu être enregistrée",
    );
    expect(TestBed.inject(ToastQueue).current()).toBeNull();
  });
});
