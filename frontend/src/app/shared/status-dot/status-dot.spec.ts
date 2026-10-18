import { TestBed } from '@angular/core/testing';

import { StatusDot } from './status-dot';

describe('StatusDot', () => {
  it('is a grey decorative dot until it gets a status, then takes its color and size', () => {
    const fixture = TestBed.createComponent(StatusDot);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.className).toBe('');

    fixture.componentRef.setInput('status', 'almost');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();

    expect(element.classList).toContain('status-dot--almost');
    expect(element.classList).toContain('status-dot--sm');
  });
});
