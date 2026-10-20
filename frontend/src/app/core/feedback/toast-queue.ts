import { Service, signal } from '@angular/core';

import { TOAST_DURATIONS_MS, UNDO_WINDOW_MS } from './feedback.constants';
import { Toast, ToastAction } from './feedback.model';

/**
 * The little message after an action ("Mot ajouté"); one at a time, a new one replaces the last.
 */
@Service()
export class ToastQueue {
  /**
   * Id of the next toast, so the outlet replays its pop when the text repeats.
   */
  private nextId = 0;

  /**
   * Timer hiding the current toast.
   */
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Toast on screen, `null` when none.
   */
  public readonly current = signal<Toast | null>(null);

  /**
   * Shows `text` for a couple of seconds, longer for a failure, and for the whole undo window when
   * it offers an action.
   */
  public show(text: string, tone: Toast['tone'] = 'success', action?: ToastAction): void {
    clearTimeout(this.timer);
    this.current.set({ id: this.nextId++, text, tone, action });
    this.timer = setTimeout(
      () => this.current.set(null),
      action ? UNDO_WINDOW_MS : TOAST_DURATIONS_MS[tone],
    );
  }

  /**
   * Hides the toast, then runs its action.
   */
  public runAction(): void {
    const action = this.current()?.action;
    this.dismiss();
    action?.run();
  }

  /**
   * Hides the toast early.
   */
  public dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
