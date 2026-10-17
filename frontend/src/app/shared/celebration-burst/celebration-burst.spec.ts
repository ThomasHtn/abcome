import { TestBed } from '@angular/core/testing';

import { Celebration } from '@core/feedback/celebration';

import { CelebrationBurst } from './celebration-burst';

describe('CelebrationBurst', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('draws a fresh confetti image for each burst', () => {
    const fixture = TestBed.createComponent(CelebrationBurst);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')).toBeNull();

    const celebration = TestBed.inject(Celebration);
    celebration.play();
    fixture.detectChanges();
    const first = element.querySelector('img');
    expect(first?.getAttribute('src')).toContain('assets/celebration/confetti.svg');

    celebration.play();
    fixture.detectChanges();
    expect(element.querySelector('img')).not.toBe(first);
  });
});
