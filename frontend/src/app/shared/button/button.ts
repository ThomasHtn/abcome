import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ButtonSize, ButtonVariant } from './button.model';

/**
 * Pill button on a native `<button>` or `<a>`, so keyboard, forms and router links work as usual.
 * Usage: `<button app-button type="button" variant="secondary">Enregistrer</button>`.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    class: 'button',
    '[class.button--primary]': "variant() === 'primary'",
    '[class.button--secondary]': "variant() === 'secondary'",
    '[class.button--outline]': "variant() === 'outline'",
    '[class.button--dark]': "variant() === 'dark'",
    '[class.button--danger]': "variant() === 'danger'",
    '[class.button--soft]': "variant() === 'soft'",
    '[class.button--link]': "variant() === 'link'",
    '[class.button--lg]': "size() === 'lg'",
    '[class.button--md]': "size() === 'md'",
    '[class.button--sm]': "size() === 'sm'",
    '[class.button--block]': 'block()',
  },
})
export class Button {
  /**
   * Look of the button.
   */
  public readonly variant = input<ButtonVariant>('primary');

  /**
   * Height of the button.
   */
  public readonly size = input<ButtonSize>('md');

  /**
   * Takes the full width of its container, as bottom-bar actions do.
   */
  public readonly block = input(false, { transform: booleanAttribute });
}
