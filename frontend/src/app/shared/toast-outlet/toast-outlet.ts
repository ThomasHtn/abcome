import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { ToastQueue } from '@core/feedback/toast-queue';
import { Icon } from '@shared/icon/icon';

/**
 * Where toasts appear, mounted once by the app shell; screens call `ToastQueue.show()`.
 * The region is a manual popover raised to the top of the top layer for each toast, so a toast also
 * shows over a modal bottom sheet opened before it.
 */
@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  /**
   * Toast to show.
   */
  protected readonly toasts = inject(ToastQueue);

  /**
   * The live region, shown as a popover.
   */
  private readonly region = viewChild.required<ElementRef<HTMLElement>>('region');

  /**
   * Raises the region once rendered and again for every new toast.
   */
  constructor() {
    afterRenderEffect(() => {
      this.toasts.current();
      this.raise();
    });
  }

  /**
   * Reopens the popover, which puts it above every dialog opened since; a no-op without popover support.
   */
  private raise(): void {
    const region = this.region().nativeElement;
    if (typeof region.showPopover !== 'function') {
      return;
    }
    if (region.matches(':popover-open')) {
      region.hidePopover();
    }
    region.showPopover();
  }
}
