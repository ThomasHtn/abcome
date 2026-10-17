import { TestBed } from '@angular/core/testing';

import { RecordingClip } from './recording-clip';

describe('RecordingClip', () => {
  it('shows a play button, the waveform and the length of the sound', () => {
    const fixture = TestBed.createComponent(RecordingClip);
    fixture.componentRef.setInput('src', 'blob:clip');
    fixture.componentRef.setInput('levels', [0.2, 0.6]);
    fixture.componentRef.setInput('durationMs', 4200);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('button')?.getAttribute('aria-label')).toBe('Écouter le son');
    expect(element.querySelectorAll('app-level-bars span')).toHaveLength(2);
    expect(element.textContent).toContain('0:04');
  });
});
