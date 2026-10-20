import { TestBed } from '@angular/core/testing';

import { TOAST_DURATIONS_MS, UNDO_WINDOW_MS } from './feedback.constants';
import { ToastQueue } from './toast-queue';

describe('ToastQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a toast, replaces it with a newer one, then hides it', () => {
    const toasts = TestBed.inject(ToastQueue);

    toasts.show('Mot ajouté');
    toasts.show('Phrase ajoutée');
    expect(toasts.current()?.text).toBe('Phrase ajoutée');

    vi.advanceTimersByTime(TOAST_DURATIONS_MS.success);
    expect(toasts.current()).toBeNull();
  });

  it('keeps a failure on screen longer, so its advice can be read', () => {
    const toasts = TestBed.inject(ToastQueue);

    toasts.show("Le son n'a pas pu être enregistré, réessaie.", 'error');
    vi.advanceTimersByTime(TOAST_DURATIONS_MS.success);
    expect(toasts.current()?.tone).toBe('error');

    vi.advanceTimersByTime(TOAST_DURATIONS_MS.error - TOAST_DURATIONS_MS.success);
    expect(toasts.current()).toBeNull();
  });

  it('keeps a toast with an action for the whole undo window', () => {
    const toasts = TestBed.inject(ToastQueue);

    toasts.show('Son supprimé', 'success', { label: 'Annuler', run: vi.fn() });
    vi.advanceTimersByTime(UNDO_WINDOW_MS - 1);
    expect(toasts.current()?.action?.label).toBe('Annuler');

    vi.advanceTimersByTime(1);
    expect(toasts.current()).toBeNull();
  });

  it('hides the toast before running its action', () => {
    const toasts = TestBed.inject(ToastQueue);
    const run = vi.fn(() => expect(toasts.current()).toBeNull());

    toasts.show('Son supprimé', 'success', { label: 'Annuler', run });
    toasts.runAction();

    expect(run).toHaveBeenCalledTimes(1);
  });
});
