import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { ICON_SPRITE_URL } from './icon.constants';
import { IconName } from './icon.model';

/**
 * Stroke icon from the sprite asset, drawn in the text colour. Always decorative: the accessible
 * name belongs to the button or link around it.
 * Usage: `<svg app-icon name="plus" [size]="20" [strokeWidth]="2.6"></svg>`.
 */
@Component({
  selector: 'svg[app-icon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.html',
  host: {
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[attr.stroke-width]': 'strokeWidth()',
    '[attr.fill]': "filled() ? 'currentColor' : 'none'",
  },
})
export class Icon {
  /**
   * Symbol of the sprite to draw.
   */
  public readonly name = input.required<IconName>();

  /**
   * Width and height in pixels.
   */
  public readonly size = input(24);

  /**
   * Stroke width in the icon's 24-unit grid.
   */
  public readonly strokeWidth = input(2);

  /**
   * Fills the shape with the text colour too, for solid play and stop glyphs.
   */
  public readonly filled = input(false, { transform: booleanAttribute });

  /**
   * Reference to the symbol inside the sprite.
   */
  protected readonly href = computed(() => `${ICON_SPRITE_URL}#${this.name()}`);
}
