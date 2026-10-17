import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Icon } from './icon';
import { IconName } from './icon.model';

/**
 * Host placing the icon on an `<svg>`, as every caller does.
 */
@Component({
  imports: [Icon],
  template: `<svg
    app-icon
    [name]="name"
    [size]="size"
    [strokeWidth]="2.6"
    [filled]="filled"
  ></svg>`,
})
class IconHost {
  /**
   * Icon asked for.
   */
  public name: IconName = 'plus';

  /**
   * Size asked for.
   */
  public size = 20;

  /**
   * Whether the shape is filled.
   */
  public filled = false;
}

describe('Icon', () => {
  /**
   * Renders the host and returns its `<svg>`.
   */
  function render(change?: (host: IconHost) => void): SVGSVGElement {
    const fixture = TestBed.createComponent(IconHost);
    change?.(fixture.componentInstance);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('svg') as SVGSVGElement;
  }

  it('points at the symbol of the sprite and stays hidden from screen readers', () => {
    const svg = render();

    expect(svg.querySelector('use')?.getAttribute('href')).toBe('assets/icons/icons.svg#plus');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('applies the size and stroke width of the caller, drawn in the text colour', () => {
    const svg = render();

    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('height')).toBe('20');
    expect(svg.getAttribute('stroke-width')).toBe('2.6');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('fills the shape when asked, for solid glyphs', () => {
    const svg = render((host) => (host.filled = true));

    expect(svg.getAttribute('fill')).toBe('currentColor');
  });
});
