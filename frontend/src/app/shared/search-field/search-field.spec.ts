import { TestBed } from '@angular/core/testing';

import { SearchField } from './search-field';

describe('SearchField', () => {
  it('names the field with its label and reports what is typed', () => {
    const fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('label', 'Chercher un mot');
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.getAttribute('aria-label')).toBe('Chercher un mot');
    expect(input?.placeholder).toBe('Chercher un mot');

    if (input) {
      input.value = 'lap';
      input.dispatchEvent(new Event('input'));
    }
    expect(fixture.componentInstance.value()).toBe('lap');
  });

  it('focuses the field once rendered when asked', async () => {
    const fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('label', 'Chercher un mot');
    fixture.componentRef.setInput('autofocus', true);
    document.body.append(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();

    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('input'),
    );
    (fixture.nativeElement as HTMLElement).remove();
  });
});
