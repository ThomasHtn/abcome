import { TestBed } from '@angular/core/testing';

import { Waveforms } from '@core/recordings/waveforms';

import { VoiceNote } from './voice-note';

describe('VoiceNote', () => {
  /**
   * Renders the note of a 3.2 s sound whose waveform decodes to `levels`.
   */
  async function render(levels: number[]) {
    TestBed.configureTestingModule({
      providers: [{ provide: Waveforms, useValue: { load: () => Promise.resolve(levels) } }],
    });
    const fixture = TestBed.createComponent(VoiceNote);
    fixture.componentRef.setInput('src', '/api/recordings/7');
    fixture.componentRef.setInput('label', 'Écouter le son');
    fixture.componentRef.setInput('durationMs', 3200);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the time played, the decoded waveform and the length', async () => {
    const element = (await render([0.2, 1])).nativeElement as HTMLElement;

    const times = [...element.querySelectorAll('.voice-note__time')].map(
      (time) => time.textContent,
    );
    expect(times).toEqual(['0:00', '0:03']);
    expect(element.querySelectorAll('.level-bars__bar')).toHaveLength(2);
    expect(element.querySelector('button')?.getAttribute('aria-label')).toBe('Écouter le son');
  });

  it('draws flat bars when the waveform cannot be decoded', async () => {
    const element = (await render([])).nativeElement as HTMLElement;

    expect(element.querySelectorAll('.level-bars__bar')).toHaveLength(48);
  });

  it('fills the bars and the clock as the sound plays', async () => {
    const fixture = await render([0.2, 0.4, 0.6, 0.8]);
    const element = fixture.nativeElement as HTMLElement;

    fixture.debugElement
      .query((node) => node.name === 'app-audio-button')
      .componentInstance.positionChange.emit(1600);
    fixture.detectChanges();

    expect(element.querySelector('.voice-note__time')?.textContent).toBe('0:01');
    expect(element.querySelectorAll('.level-bars__bar--played')).toHaveLength(2);
  });
});
