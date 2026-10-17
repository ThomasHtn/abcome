import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheet } from './bottom-sheet';

/**
 * Hosts a sheet bound to a signal, as screens do.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet],
  template: `<button type="button" (click)="open.set(true)">Ajouter une phrase</button>
    <app-bottom-sheet heading="Nouvelle phrase" [(open)]="open" [error]="error()"
      ><p>Formulaire</p>
      <input aria-label="Ce que Côme a dit" />
      <div sheetActions><button type="button">Enregistrer</button></div></app-bottom-sheet
    >`,
})
class Host {
  /**
   * Whether the sheet is shown.
   */
  public readonly open = signal(false);

  /**
   * Save error passed to the sheet.
   */
  public readonly error = signal<string | null>(null);
}

describe('BottomSheet', () => {
  beforeAll(() => {
    // jsdom has no modal dialogs: stand in with the `open` attribute and the close event.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  /**
   * Renders the host sheet, closed.
   */
  function render(): ComponentFixture<Host> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * The native dialog of a rendered host.
   */
  function dialogOf(fixture: ComponentFixture<Host>): HTMLDialogElement {
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog');
    if (!dialog) {
      throw new Error('dialog missing');
    }
    return dialog;
  }

  it('opens as a named modal dialog with the projected content', () => {
    const fixture = render();
    const dialog = dialogOf(fixture);

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Nouvelle phrase');
    expect(dialog.textContent).toContain('Formulaire');
  });

  it('shows a save error as an alert above the actions, and nothing without one', () => {
    const fixture = render();
    const dialog = dialogOf(fixture);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(dialog.querySelector('[role="alert"]')).toBeNull();

    fixture.componentInstance.error.set("La phrase n'a pas pu être enregistrée.");
    fixture.detectChanges();

    const alert = dialog.querySelector('[role="alert"]');
    const actions = dialog.querySelector('[sheetActions]');
    expect(alert?.textContent).toContain("La phrase n'a pas pu être enregistrée.");
    expect(actions && alert && alert.compareDocumentPosition(actions)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('closes from its close button and updates the bound signal', () => {
    const fixture = render();
    const dialog = dialogOf(fixture);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    dialog.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('focuses the first control of its content, then gives focus back to the opener', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const opener = element.querySelector<HTMLButtonElement>('button');
    opener?.focus();

    opener?.click();
    TestBed.tick();
    expect(document.activeElement).toBe(element.querySelector('input'));

    dialogOf(fixture).querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')?.click();
    TestBed.tick();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a tap on the veil, not on its content', () => {
    const fixture = render();
    const dialog = dialogOf(fixture);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    dialog.querySelector('p')?.click();
    expect(fixture.componentInstance.open()).toBe(true);

    dialog.click();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
