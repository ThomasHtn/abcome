import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { FilterChipOption } from './filter-chips.model';

/**
 * Row of toggle chips choosing one filter ("Tous", "Bien dit", "Presque", "En route"); scrolls sideways
 * when it does not fit, edge to edge of the screen with `bleed`, or shares the width equally with `fill`.
 * Usage: `<app-filter-chips label="Filtrer" fill [options]="filters" [(value)]="filter" />`.
 */
@Component({
  selector: 'app-filter-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-chips.html',
  styleUrl: './filter-chips.scss',
})
export class FilterChips<T extends string> {
  /**
   * Chips in display order.
   */
  public readonly options = input.required<readonly FilterChipOption<T>[]>();

  /**
   * Selected value, two-way bound.
   */
  public readonly value = model.required<T>();

  /**
   * Accessible name of the group ("Filtrer les mots").
   */
  public readonly label = input.required<string>();

  /**
   * Lets the row run under the screen's side margins, so chips scroll from edge to edge while the
   * first and last ones still line up with the content.
   */
  public readonly bleed = input(false, { transform: booleanAttribute });

  /**
   * Shares the row's width equally between the chips so a few short labels always fit without
   * scrolling; they only wrap onto a second row when even the compact chips cannot fit (large text).
   */
  public readonly fill = input(false, { transform: booleanAttribute });
}
