import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PronunciationForm } from './pronunciation-form';
import { PronunciationDraft } from './pronunciation-form.model';

/**
 * Hosts a form bound to a draft signal, as screens do.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PronunciationForm],
  template: `<app-pronunciation-form dateLabel="Entendu le" [(draft)]="draft" />`,
})
class Host {
  /**
   * Draft owned by the screen.
   */
  public readonly draft = signal<PronunciationDraft>({
    spoken: 'pin',
    status: 'learning',
    date: '2026-09-16',
  });
}

describe('PronunciationForm', () => {
  it('shows the draft in its three fields', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe('pin');
    expect(element.querySelector<HTMLInputElement>('input:checked')?.value).toBe('learning');
    expect(element.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('2026-09-16');
    expect(element.textContent).toContain('Entendu le');
  });

  it('writes each change back into the draft, keeping the other fields', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const spoken = element.querySelector<HTMLInputElement>('input[type="text"]');
    if (spoken) {
      spoken.value = 'apin';
      spoken.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLInputElement>('input[value="almost"]')?.click();

    expect(fixture.componentInstance.draft()).toEqual({
      spoken: 'apin',
      status: 'almost',
      date: '2026-09-16',
    });
  });
});
