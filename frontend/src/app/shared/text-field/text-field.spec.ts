import { TestBed } from '@angular/core/testing';

import { TextField } from './text-field';

describe('TextField', () => {
  it('links the label to the input and reports what is typed', () => {
    const fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Comment Côme le dit');
    fixture.componentRef.setInput('maxLength', 60);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input');
    expect(element.querySelector('label')?.getAttribute('for')).toBe(input?.id);
    expect(input?.getAttribute('maxlength')).toBe('60');

    if (input) {
      input.value = 'apin';
      input.dispatchEvent(new Event('input'));
    }
    expect(fixture.componentInstance.value()).toBe('apin');
  });

  it('marks the field invalid and announces the error instead of the hint', () => {
    const fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Ce que Côme a dit');
    fixture.componentRef.setInput('multiline', true);
    fixture.componentRef.setInput('hint', 'Une aide');
    fixture.componentRef.setInput('error', 'Écris ce que Côme a dit.');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const textarea = element.querySelector('textarea');
    expect(textarea?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Écris ce que Côme a dit.',
    );
    expect(element.textContent).not.toContain('Une aide');
  });
});
