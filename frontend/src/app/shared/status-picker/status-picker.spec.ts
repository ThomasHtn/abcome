import { TestBed } from '@angular/core/testing';

import { StatusPicker } from './status-picker';

describe('StatusPicker', () => {
  it('offers the three statuses as labelled radios, the bound one checked', () => {
    const fixture = TestBed.createComponent(StatusPicker);
    fixture.componentRef.setInput('value', 'learning');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const labels = [...element.querySelectorAll('label')].map((label) => label.textContent?.trim());
    expect(labels).toEqual(['En route', 'Presque', 'Bien dit']);
    const checked = element.querySelector<HTMLInputElement>('input:checked');
    expect(checked?.value).toBe('learning');
  });

  it('updates the bound value when another tile is chosen', () => {
    const fixture = TestBed.createComponent(StatusPicker);
    fixture.detectChanges();

    const mastered = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[value="mastered"]',
    );
    mastered?.click();

    expect(fixture.componentInstance.value()).toBe('mastered');
  });
});
