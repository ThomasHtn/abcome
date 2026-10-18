import { TestBed } from '@angular/core/testing';

import { LevelBars } from './level-bars';

describe('LevelBars', () => {
  it('draws one bar per level, silence as a short line and a shout at full height', () => {
    const fixture = TestBed.createComponent(LevelBars);
    fixture.componentRef.setInput('levels', [0, 0.5, 1, 3]);
    fixture.detectChanges();

    const bars = [...(fixture.nativeElement as HTMLElement).querySelectorAll('span')];
    expect(bars.map((bar) => bar.style.blockSize)).toEqual(['6px', '45px', '84px', '84px']);
  });

  it('darkens the bars already played, from the left', () => {
    const fixture = TestBed.createComponent(LevelBars);
    fixture.componentRef.setInput('levels', [0.2, 0.4, 0.6, 0.8]);
    fixture.componentRef.setInput('progress', 0.5);
    fixture.detectChanges();

    const bars = [...(fixture.nativeElement as HTMLElement).querySelectorAll('span')];
    expect(bars.map((bar) => bar.classList.contains('level-bars__bar--played'))).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('is hidden from screen readers', () => {
    const fixture = TestBed.createComponent(LevelBars);
    fixture.componentRef.setInput('levels', [0.2]);
    fixture.componentRef.setInput('tone', 'live');
    fixture.detectChanges();

    const row = (fixture.nativeElement as HTMLElement).querySelector('div');
    expect(row?.getAttribute('aria-hidden')).toBe('true');
    expect(row?.classList).toContain('level-bars--live');
  });
});
