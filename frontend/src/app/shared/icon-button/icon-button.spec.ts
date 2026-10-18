import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IconButton } from './icon-button';

/**
 * Hosts a destructive row action as the word page's sound rows do.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButton],
  template: `<button
    app-icon-button
    type="button"
    tone="danger"
    size="sm"
    aria-label="Supprimer le son"
  >
    x
  </button>`,
})
class Host {}

describe('IconButton', () => {
  it('keeps the caller label and marks the danger tone and the small size', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Supprimer le son');
    expect(button?.classList).toContain('icon-button--danger');
    expect(button?.classList).toContain('icon-button--sm');
  });
});
