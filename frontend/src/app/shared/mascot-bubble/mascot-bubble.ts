import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Mascot } from '@shared/mascot/mascot';
import { MascotState } from '@shared/mascot/mascot.model';

/**
 * Lapinou asking or explaining something in a salmon speech bubble ("Quel mot [child] a-t-il dit ?").
 * Usage: `<app-mascot-bubble live>J'écoute…</app-mascot-bubble>`.
 */
@Component({
  selector: 'app-mascot-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Mascot],
  templateUrl: './mascot-bubble.html',
  styleUrl: './mascot-bubble.scss',
})
export class MascotBubble {
  /**
   * Mascot state, `idle` by default.
   */
  public readonly state = input<MascotState>('idle');

  /**
   * Mascot width in pixels.
   */
  public readonly size = input(56);

  /**
   * Announces each new text to screen readers, for instructions that change with the screen's state.
   */
  public readonly live = input(false, { transform: booleanAttribute });
}
