import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core';

import { translate, TranslocoPipe } from '@jsverse/transloco';

import { ToastQueue } from '@core/feedback/toast-queue';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';

import { MENU_KEY_MOVES, MENU_OFFSET_PX } from './home-menu.constants';

/**
 * The "⋯" of the home header: downloads the whole notebook, or signs out.
 * A popover menu, so the browser handles opening, closing on a tap outside or Escape, and focus return.
 */
@Component({
  selector: 'app-home-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, TranslocoPipe],
  templateUrl: './home-menu.html',
  styleUrl: './home-menu.scss',
})
export class HomeMenu {
  /**
   * Says the download started, since the browser may only show it in its own bar.
   */
  private readonly toasts = inject(ToastQueue);

  /**
   * The "⋯" button, under which the menu opens.
   */
  private readonly trigger = viewChild.required('trigger', { read: ElementRef<HTMLElement> });

  /**
   * The menu popover.
   */
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  /**
   * Archive of the whole notebook.
   */
  protected readonly exportUrl = API_ENDPOINTS.export;

  /**
   * Asks the page to confirm the logout.
   */
  public readonly logout = output();

  /**
   * Places the menu under its button, right edges aligned, before it shows.
   */
  protected onBeforeToggle(event: Event): void {
    if ((event as ToggleEvent).newState !== 'open') {
      return;
    }
    const button = this.trigger().nativeElement.getBoundingClientRect();
    const menu = this.menu().nativeElement;
    const viewportWidth = menu.ownerDocument.documentElement.clientWidth;
    menu.style.setProperty('--home-menu-top', `${button.bottom + MENU_OFFSET_PX}px`);
    menu.style.setProperty('--home-menu-right', `${viewportWidth - button.right}px`);
  }

  /**
   * Moves the focus to the first item once the menu shows.
   */
  protected onToggle(event: Event): void {
    if ((event as ToggleEvent).newState === 'open') {
      this.items()[0]?.focus();
    }
  }

  /**
   * Arrow keys, Home and End move between items, wrapping around.
   */
  protected moveFocus(event: KeyboardEvent): void {
    const move = MENU_KEY_MOVES[event.key];
    if (!move) {
      return;
    }
    event.preventDefault();
    const items = this.items();
    const current = items.indexOf(
      this.menu().nativeElement.ownerDocument.activeElement as HTMLElement,
    );
    const next = {
      next: (current + 1) % items.length,
      previous: (current - 1 + items.length) % items.length,
      first: 0,
      last: items.length - 1,
    }[move];
    items[next]?.focus();
  }

  /**
   * Closes the menu and says the archive is on its way; the link itself starts the download.
   */
  protected download(): void {
    this.close();
    this.toasts.show(translate('home.menu.downloadStarted'));
  }

  /**
   * Closes the menu and hands the logout question to the page.
   */
  protected chooseLogout(): void {
    this.close();
    this.logout.emit();
  }

  /**
   * Items of the menu, in order.
   */
  private items(): HTMLElement[] {
    return [...this.menu().nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  }

  /**
   * Hides the menu; a no-op without popover support.
   */
  private close(): void {
    const menu = this.menu().nativeElement;
    if (typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) {
      menu.hidePopover();
    }
  }
}
