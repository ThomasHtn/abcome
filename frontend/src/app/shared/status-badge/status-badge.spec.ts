import { TestBed } from '@angular/core/testing';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('names a lone dot for screen readers and shows the status glyph', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', 'almost');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.status-badge');
    expect(badge?.getAttribute('role')).toBe('img');
    expect(badge?.getAttribute('aria-label')).toBe('Presque');
    expect(badge?.querySelector('img')?.getAttribute('src')).toContain('assets/status/almost.svg');
  });

  it('writes the label out in the pill variant instead of naming an image', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', 'mastered');
    fixture.componentRef.setInput('variant', 'pill');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.status-badge');
    expect(badge?.textContent?.trim()).toBe('Bien dit');
    expect(badge?.hasAttribute('role')).toBe(false);
  });
});
