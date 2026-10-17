import { TestBed } from '@angular/core/testing';

import { TOAST_DURATION_MS } from './feedback.constants';
import { ToastQueue } from './toast-queue';

describe('ToastQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a toast, replaces it with a newer one, then hides it', () => {
    const toasts = TestBed.inject(ToastQueue);

    toasts.show('Mot ajouté');
    toasts.show('Phrase ajoutée');
    expect(toasts.current()?.text).toBe('Phrase ajoutée');

    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(toasts.current()).toBeNull();
  });
});
