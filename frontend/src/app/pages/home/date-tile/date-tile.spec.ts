import { TestBed } from '@angular/core/testing';

import { DateTile } from './date-tile';

describe('DateTile', () => {
  it('shows the day over the month and hides itself from screen readers', () => {
    const fixture = TestBed.createComponent(DateTile);
    fixture.componentRef.setInput('day', '16');
    fixture.componentRef.setInput('month', 'sept');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.date-tile__day')!.textContent).toBe('16');
    expect(element.querySelector('.date-tile__month')!.textContent).toBe('sept');
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });
});
