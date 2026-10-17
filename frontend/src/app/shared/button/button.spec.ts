import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';

/**
 * Hosts the button on a native element, as screens do.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `<button app-button type="button" variant="danger" size="lg" block>
    Oui, supprimer
  </button>`,
})
class Host {}

describe('Button', () => {
  it('keeps the native button and applies its variant, size and width', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.textContent?.trim()).toBe('Oui, supprimer');
    expect(button?.className).toContain('button--danger');
    expect(button?.className).toContain('button--lg');
    expect(button?.className).toContain('button--block');
    expect(button?.className).not.toContain('button--primary');
  });
});
