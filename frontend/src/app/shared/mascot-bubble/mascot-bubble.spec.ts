import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MascotBubble } from './mascot-bubble';

/**
 * Hosts a live bubble with a text, as screens do.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MascotBubble],
  template: `<app-mascot-bubble live>Quel mot Côme a-t-il dit ?</app-mascot-bubble>`,
})
class Host {}

describe('MascotBubble', () => {
  it('shows the text next to a decorative mascot, announced when live', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const bubble = element.querySelector('p');
    expect(bubble?.textContent?.trim()).toBe('Quel mot Côme a-t-il dit ?');
    expect(bubble?.getAttribute('role')).toBe('status');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('');
  });
});
