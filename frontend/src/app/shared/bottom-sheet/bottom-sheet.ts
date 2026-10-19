import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  viewChild,
} from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

import { Icon } from '@shared/icon/icon';
import { IconButton } from '@shared/icon-button/icon-button';

import { FOCUSABLE_SELECTOR } from './bottom-sheet.constants';

/**
 * Drawer rising from the bottom ("Tiroir"), on a native modal `<dialog>`: the browser traps focus,
 * hides the page from screen readers and closes on Escape. Focus goes to the first control of the
 * content on open and back to the opener on close.
 * Usage: `<app-bottom-sheet heading="Nouvelle phrase" [(open)]="editing" [error]="saveError()">`, the
 * form as content and its buttons in an element marked `sheetActions`, so an error sits above them.
 */
@Component({
  selector: 'app-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, IconButton, TranslocoPipe],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
})
export class BottomSheet {
  /**
   * The native dialog driven by `open`.
   */
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /**
   * Wrapper of the projected content, searched for the control to focus.
   */
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  /**
   * Page document, read for the element that had focus before opening.
   */
  private readonly document = inject(DOCUMENT);

  /**
   * Injector for the after-render focus, which runs outside the constructor.
   */
  private readonly injector = inject(Injector);

  /**
   * Element focused before opening, focused again on close.
   */
  private opener: HTMLElement | null = null;

  /**
   * Whether the sheet is shown, two-way bound; Escape, the veil and the close button set it to false.
   */
  public readonly open = model(false);

  /**
   * Title of the sheet, also its accessible name.
   */
  public readonly heading = input.required<string>();

  /**
   * Shows the close button in the corner; off for a plain confirmation that has its own "Annuler".
   */
  public readonly closable = input(true, { transform: booleanAttribute });

  /**
   * Save error to show inside the sheet, above its actions; a toast would sit under the modal.
   */
  public readonly error = input<string | null>(null);

  /**
   * Announces the sheet as an `alertdialog`: a question to answer before going on (a confirmation).
   */
  public readonly alert = input(false, { transform: booleanAttribute });

  /**
   * Mirrors `open` onto the native dialog, and gives the focus back when the screen removes the
   * sheet while open (a sheet that closes itself by leaving the page), which fires no `close`.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.dialog().nativeElement.open) {
        this.restoreFocus();
      }
    });
    // Mirrors `open` onto the dialog; `showModal` is what makes the rest of the page inert.
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        const active = this.document.activeElement;
        this.opener = active instanceof HTMLElement ? active : null;
        dialog.showModal();
        afterNextRender(() => this.focusFirstControl(), { injector: this.injector });
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /**
   * Closes the sheet.
   */
  protected close(): void {
    this.open.set(false);
  }

  /**
   * Keeps `open` in step when the browser closes the dialog itself (Escape).
   */
  protected onNativeClose(): void {
    this.open.set(false);
    this.restoreFocus();
  }

  /**
   * Closes on a tap on the veil: only then is the dialog itself the target, its content fills it.
   */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  /**
   * Focuses the element that opened the sheet again, if it is still on the page.
   */
  private restoreFocus(): void {
    if (this.opener?.isConnected) {
      this.opener.focus();
    }
    this.opener = null;
  }

  /**
   * Focuses the first enabled control of the content, so typing starts where the form starts.
   */
  private focusFirstControl(): void {
    this.content().nativeElement.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
  }
}
