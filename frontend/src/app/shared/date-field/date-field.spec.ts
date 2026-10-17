import { ComponentFixture, TestBed } from '@angular/core/testing';

import { todayIso } from '@core/date/date.utils';

import { DateField } from './date-field';

describe('DateField', () => {
  /**
   * Renders the field with a label.
   */
  function render(): ComponentFixture<DateField> {
    const fixture = TestBed.createComponent(DateField);
    fixture.componentRef.setInput('label', 'Dit pour la première fois le');
    fixture.detectChanges();
    return fixture;
  }

  /**
   * The native date input of a rendered field.
   */
  function inputOf(fixture: ComponentFixture<DateField>): HTMLInputElement {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    if (!input) {
      throw new Error('date input missing');
    }
    return input;
  }

  it('starts on today and forbids the future', () => {
    const input = inputOf(render());

    expect(input.value).toBe(todayIso());
    expect(input.max).toBe(todayIso());
  });

  it('takes a picked day without any message', () => {
    const fixture = render();
    const input = inputOf(fixture);

    input.value = '2026-09-16';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('2026-09-16');
    expect(fixture.componentInstance.invalid()).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('keeps a cleared picker empty and asks for a date', () => {
    const fixture = render();
    const input = inputOf(fixture);

    input.value = '';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('');
    expect(fixture.componentInstance.invalid()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Choisis une date.');
    expect(input.getAttribute('aria-describedby')).toContain('-error');
  });

  it('flags a typed future day', () => {
    const fixture = render();
    fixture.componentInstance.value.set('2099-05-05');
    fixture.detectChanges();

    expect(fixture.componentInstance.invalid()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'La date ne peut pas être dans le futur.',
    );
  });
});
