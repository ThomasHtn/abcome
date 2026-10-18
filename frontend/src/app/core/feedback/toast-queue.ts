import { Service, signal } from '@angular/core';

import { TOAST_DURATIONS_MS } from './feedback.constants';
import { Toast } from './feedback.model';

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
   * Shows `text` for a couple of seconds, longer for a failure.
   */
  public show(text: string, tone: Toast['tone'] = 'success'): void {
    clearTimeout(this.timer);
    this.current.set({ id: this.nextId++, text, tone });
    this.timer = setTimeout(() => this.current.set(null), TOAST_DURATIONS_MS[tone]);
  }

  /**
   * Hides the toast early.
   */
  public dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
