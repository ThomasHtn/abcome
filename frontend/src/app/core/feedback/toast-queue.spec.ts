import { TestBed } from '@angular/core/testing';

import { TOAST_DURATIONS_MS } from './feedback.constants';
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
});
