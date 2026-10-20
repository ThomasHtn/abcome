import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { ACTION_BAR_HEIGHT_PROPERTY } from './action-bar.constants';

/**
 * Ids handed to bars, so the one that last published its height is known.
 */
let nextBarId = 0;

/**
 * Id of the bar that last published its height, so an older bar leaving does not erase a newer one's.
 */
let heightOwnerId: number | null = null;

/**
 * Bottom bar holding a screen's main action, fixed under the thumb and clear of the home indicator.
 * A screen using it leaves `var(--layout-action-bar-space)` at the end of its scrolling content.
 * It publishes its real height as `--action-bar-height` on the root, so toasts sit right above it.
 */
@Component({
  selector: 'app-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-bar.html',
  styleUrl: './action-bar.scss',
})
export class ActionBar {
  /**
   * The fixed bar, measured whenever it changes size (wrapping text, zoom, rotation).
   */
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');

  /**
   * Whether the bar is shown in place, without sliding up, when its screen comes back.
   */
  public readonly settled = input(false);

  /**
   * Root element carrying the published height.
   */
  private readonly root = inject(DOCUMENT).documentElement;

  /**
   * This bar's id, compared with the owner of the published height.
   */
  private readonly id = nextBarId++;

  /**
   * Starts measuring once rendered and clears the published height when the screen leaves.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        const height = entry?.borderBoxSize[0]?.blockSize ?? this.bar().nativeElement.offsetHeight;
        heightOwnerId = this.id;
        this.root.style.setProperty(ACTION_BAR_HEIGHT_PROPERTY, `${Math.ceil(height)}px`);
      });
      observer.observe(this.bar().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => {
      if (heightOwnerId === this.id) {
        heightOwnerId = null;
        this.root.style.removeProperty(ACTION_BAR_HEIGHT_PROPERTY);
      }
    });
  }
}
