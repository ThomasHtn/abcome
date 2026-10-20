import { TestBed } from '@angular/core/testing';

import { ToastQueue } from '@core/feedback/toast-queue';
import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { HomeMenu } from './home-menu';

describe('HomeMenu', () => {
  /**
   * Number of logout requests the menu handed to the page.
   */
  let logouts: number;

  /**
   * Renders the menu and returns its element.
   */
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HomeMenu);
    logouts = 0;
    fixture.componentInstance.logout.subscribe(() => logouts++);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('opens a menu popover from its "⋯" button', () => {
    const element = render();
    const button = element.querySelector('button[aria-label="Menu du carnet"]');
    const menu = element.querySelector('[role="menu"]');

    expect(button?.getAttribute('popovertarget')).toBe(menu?.id);
    expect(button?.getAttribute('aria-haspopup')).toBe('menu');
    expect(menu?.hasAttribute('popover')).toBe(true);
  });

  it('downloads the whole notebook through a plain link and says it started', () => {
    const element = render();
    const link = element.querySelector<HTMLAnchorElement>('a[role="menuitem"]')!;

    expect(link.getAttribute('href')).toBe(API_ENDPOINTS.export);
    expect(link.hasAttribute('download')).toBe(true);
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();

    expect(TestBed.inject(ToastQueue).current()?.text).toBe(
      'Le carnet se télécharge, avec tous ses sons.',
    );
  });

  it('hands the logout to the page', () => {
    const element = render();

    element.querySelector<HTMLButtonElement>('button[role="menuitem"]')!.click();

    expect(logouts).toBe(1);
  });

  it('moves the focus between items with the arrows, wrapping around', () => {
    const element = render();
    document.body.append(element);
    const [download, logout] = element.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const menu = element.querySelector('[role="menu"]')!;
    const press = (key: string): void => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    download.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(logout);
    press('ArrowDown');
    expect(document.activeElement).toBe(download);
    press('ArrowUp');
    expect(document.activeElement).toBe(logout);
    press('Home');
    expect(document.activeElement).toBe(download);
    element.remove();
  });
});
