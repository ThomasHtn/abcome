import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';

import { BottomSheet } from '@shared/bottom-sheet/bottom-sheet';
import { Button } from '@shared/button/button';

/**
 * Yes-or-no question in a bottom sheet ("Se déconnecter ?", "Supprimer « lapin » ?").
 * The screen runs the action on `confirmed` and closes the sheet itself once done.
 */
@Component({
  selector: 'app-confirm-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet, Button],
  templateUrl: './confirm-sheet.html',
  styleUrl: './confirm-sheet.scss',
})
export class ConfirmSheet {
  /**
   * Whether the sheet is shown, two-way bound.
   */
  public readonly open = model(false);

  /**
   * The question.
   */
  public readonly heading = input.required<string>();

  /**
   * What happens if confirmed ("On ne pourra pas revenir en arrière.").
   */
  public readonly message = input('');

  /**
   * Confirm button text ("Oui, supprimer").
   */
  public readonly confirmLabel = input.required<string>();

  /**
   * Cancel button text ("Garder").
   */
  public readonly cancelLabel = input('Annuler');

  /**
   * `danger` red confirm for a deletion, `dark` ink confirm for a log out.
   */
  public readonly tone = input<'danger' | 'dark'>('danger');

  /**
   * Disables both buttons while the action runs, so it is never sent twice.
   */
  public readonly busy = input(false, { transform: booleanAttribute });

  /**
   * Emitted when the visitor confirms.
   */
  public readonly confirmed = output();
}
