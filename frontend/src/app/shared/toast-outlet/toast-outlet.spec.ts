import { TestBed } from '@angular/core/testing';

import { ToastQueue } from '@core/feedback/toast-queue';

import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  it('announces the current toast in its live region', () => {
    const fixture = TestBed.createComponent(ToastOutlet);
    fixture.detectChanges();
    const region = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(region?.textContent?.trim()).toBe('');

    TestBed.inject(ToastQueue).show('Mot ajouté');
    fixture.detectChanges();

    expect(region?.textContent?.trim()).toBe('Mot ajouté');
  });

  it('raises its popover for every toast, so it shows above an open sheet', () => {
    const shown = vi.fn();
    const hidden = vi.fn();
    const proto = HTMLElement.prototype as HTMLElement & Partial<Record<string, unknown>>;
    const original = { show: proto.showPopover, hide: proto.hidePopover };
    let open = false;
    proto.showPopover = function () {
      open = true;
      shown();
    };
    proto.hidePopover = function () {
      open = false;
      hidden();
    };
    const matches = vi
      .spyOn(HTMLElement.prototype, 'matches')
      .mockImplementation((selector: string) => selector === ':popover-open' && open);
    try {
      const fixture = TestBed.createComponent(ToastOutlet);
      fixture.detectChanges();
      expect(shown).toHaveBeenCalledTimes(1);

      TestBed.inject(ToastQueue).show('Phrase notée');
      fixture.detectChanges();

      expect(hidden).toHaveBeenCalledTimes(1);
      expect(shown).toHaveBeenCalledTimes(2);
    } finally {
      matches.mockRestore();
      proto.showPopover = original.show as HTMLElement['showPopover'];
      proto.hidePopover = original.hide as HTMLElement['hidePopover'];
    }
  });
});
