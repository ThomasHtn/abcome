import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ActionBar } from './action-bar';

/**
 * Hosts the bar with one action, as a screen does.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionBar],
  template: `<app-action-bar><button type="button">Ajouter un mot</button></app-action-bar>`,
})
class Host {}

describe('ActionBar', () => {
  it('projects the screen actions', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.action-bar');
    expect(bar?.querySelector('button')?.textContent).toBe('Ajouter un mot');
  });

  it('slides up by default, and shows in place when settled', () => {
    const fixture = TestBed.createComponent(ActionBar);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('.action-bar')!;
    expect(bar.classList).toContain('enter-bottom');

    fixture.componentRef.setInput('settled', true);
    fixture.detectChanges();
    expect(bar.classList).not.toContain('enter-bottom');
  });

  it('publishes its measured height on the root and clears it when the screen leaves', async () => {
    const original = globalThis.ResizeObserver;
    // jsdom has no ResizeObserver: this one reports a 104 px bar as soon as it observes.
    globalThis.ResizeObserver = class {
      /**
       * Keeps the bar's callback to report the size.
       */
      constructor(private readonly callback: ResizeObserverCallback) {}

      /**
       * Reports the fixed size at once.
       */
      public observe(): void {
        const entry = { borderBoxSize: [{ blockSize: 103.4, inlineSize: 390 }] };
        this.callback([entry as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      /**
       * Nothing to stop.
       */
      public disconnect(): void {
        return;
      }

      /**
       * Nothing to stop.
       */
      public unobserve(): void {
        return;
      }
    };
    const root = document.documentElement;
    try {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(root.style.getPropertyValue('--action-bar-height')).toBe('104px');

      fixture.destroy();
      expect(root.style.getPropertyValue('--action-bar-height')).toBe('');
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});
