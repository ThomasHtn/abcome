import { TestBed } from '@angular/core/testing';

import { MilestoneMarker } from './milestone-marker';

describe('MilestoneMarker', () => {
  it('reads as its label, the badge showing the count', () => {
    const fixture = TestBed.createComponent(MilestoneMarker);
    fixture.componentRef.setInput('marker', {
      key: 'words-10',
      kind: 'words',
      count: 10,
      label: '10 mots, à 17 mois',
    });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-milestone-badge')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('app-milestone-badge')?.textContent?.trim()).toBe('10');
    expect(
      element.querySelector('.milestone-marker__label')?.textContent?.replace(/\s+/gu, ' ').trim(),
    ).toBe('10 10 mots, à 17 mois');
  });

  it('shows an icon for a first time', () => {
    const fixture = TestBed.createComponent(MilestoneMarker);
    fixture.componentRef.setInput('marker', {
      key: 'first-sentence',
      kind: 'first-sentence',
      count: null,
      label: 'Première phrase, à 18 mois',
    });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('app-milestone-badge use')
        ?.getAttribute('href'),
    ).toContain('#message-circle');
  });
});
