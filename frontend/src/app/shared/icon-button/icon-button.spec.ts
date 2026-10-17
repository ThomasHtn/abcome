import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IconButton } from './icon-button';

/**
 * Hosts a destructive icon button as the word page does.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButton],
  template: `<button app-icon-button type="button" tone="danger" aria-label="Supprimer le mot">
    x
  </button>`,
})
class Host {}

describe('IconButton', () => {
  it('keeps the caller label and marks the danger tone', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Supprimer le mot');
    expect(button?.classList).toContain('icon-button--danger');
  });
});
