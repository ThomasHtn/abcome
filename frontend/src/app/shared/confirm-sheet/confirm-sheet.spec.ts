import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConfirmSheet } from './confirm-sheet';

/**
 * Hosts the log-out confirmation of the home screen.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmSheet],
  template: `
    <app-confirm-sheet
      heading="Se déconnecter ?"
      message="Les mots de Côme restent enregistrés."
      confirmLabel="Se déconnecter"
      cancelLabel="Rester"
      tone="dark"
      [(open)]="open"
      (confirmed)="confirmations = confirmations + 1"
    />
  `,
})
class Host {
  /**
   * Whether the sheet is shown.
   */
  public readonly open = signal(true);

  /**
   * Number of confirmations received.
   */
  public confirmations = 0;
}

describe('ConfirmSheet', () => {
  beforeAll(() => {
    // jsdom has no modal dialogs: stand in with the `open` attribute.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('emits on confirm and closes on cancel', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Les mots de Côme restent enregistrés.');
    expect(element.querySelector('dialog')?.getAttribute('role')).toBe('alertdialog');
    const [cancel, confirm] = element.querySelectorAll<HTMLButtonElement>('.grid button');
    expect(confirm.textContent?.trim()).toBe('Se déconnecter');

    confirm.click();
    expect(fixture.componentInstance.confirmations).toBe(1);

    cancel.click();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
