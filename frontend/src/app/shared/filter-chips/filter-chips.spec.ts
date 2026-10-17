import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FilterChips } from './filter-chips';
import { FilterChipOption } from './filter-chips.model';

/**
 * Hosts the home screen's filter row.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterChips],
  template: `<app-filter-chips
    label="Filtrer les mots"
    [bleed]="bleed()"
    [fill]="fill()"
    [options]="options"
    [(value)]="filter"
  />`,
})
class Host {
  /**
   * The home screen's filters.
   */
  public readonly options: FilterChipOption<string>[] = [
    { value: 'all', label: 'Tous', tone: 'neutral' },
    { value: 'mastered', label: 'Bien dit', tone: 'mastered' },
  ];

  /**
   * Selected filter.
   */
  public readonly filter = signal('all');

  /**
   * Whether the row runs under the screen gutters.
   */
  public readonly bleed = signal(false);

  /**
   * Whether the chips share the row's width.
   */
  public readonly fill = signal(false);
}

describe('FilterChips', () => {
  it('presses the selected chip and selects another on tap', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const [all, mastered] = element.querySelectorAll('button');
    expect(all.getAttribute('aria-pressed')).toBe('true');
    expect(mastered.getAttribute('aria-pressed')).toBe('false');

    mastered.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filter()).toBe('mastered');
    expect(mastered.getAttribute('aria-pressed')).toBe('true');
  });

  it('runs under the screen gutters only when asked', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('.filter-chips');
    expect(row?.classList).not.toContain('filter-chips--bleed');

    fixture.componentInstance.bleed.set(true);
    fixture.detectChanges();

    expect(row?.classList).toContain('filter-chips--bleed');
  });

  it('shares the width between the chips only when asked', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('.filter-chips');
    expect(row?.classList).not.toContain('filter-chips--fill');

    fixture.componentInstance.fill.set(true);
    fixture.detectChanges();

    expect(row?.classList).toContain('filter-chips--fill');
  });
});
