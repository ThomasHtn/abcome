import { TestBed } from '@angular/core/testing';

import { DateTile } from './date-tile';

describe('DateTile', () => {
  /**
   * Renders a tile with `value` over `unit`.
   */
  function render(value: string, unit: string, age = false): HTMLElement {
    const fixture = TestBed.createComponent(DateTile);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('age', age);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the day over the month and hides itself from screen readers', () => {
    const element = render('16', 'sept');

    expect(element.querySelector('.date-tile__day')!.textContent).toBe('16');
    expect(element.querySelector('.date-tile__month')!.textContent).toBe('sept');
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.classList).not.toContain('date-tile--age');
  });

  it('tints an age tile salmon', () => {
    const element = render('17', 'mois', true);

    expect(element.querySelector('.date-tile__day')!.textContent).toBe('17');
    expect(element.classList).toContain('date-tile--age');
  });
});
