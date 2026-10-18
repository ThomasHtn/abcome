import { TestBed } from '@angular/core/testing';

import { Waveforms } from '@core/recordings/waveforms';
import { aRecording } from '@core/words/word.fixtures';
import { Recording } from '@core/words/word.model';

import { gallerySounds } from '../word-detail.utils';
import { StageSounds } from './stage-sounds';

describe('StageSounds', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Waveforms, useValue: { load: () => Promise.resolve([]) } }],
    });
  });

  it('lists the sounds newest first as voice notes, and asks for the actions of one', () => {
    const newest = aRecording({ id: 2, createdAt: '2026-10-17T09:00:00Z', durationMs: 3000 });
    const oldest = aRecording({ id: 1, createdAt: '2026-10-12T09:00:00Z', durationMs: 5000 });
    const fixture = TestBed.createComponent(StageSounds);
    fixture.componentRef.setInput('sounds', gallerySounds([newest, oldest]));
    fixture.componentRef.setInput('label', 'Sons de « apin »');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const asked: Recording[] = [];
    fixture.componentInstance.actions.subscribe((recording) => asked.push(recording));

    expect(element.querySelector('ul')?.getAttribute('aria-label')).toBe('Sons de « apin »');
    const lengths = [...element.querySelectorAll('app-voice-note')].map(
      (note) => note.querySelectorAll('.voice-note__time')[1]?.textContent,
    );
    expect(lengths).toEqual(['0:03', '0:05']);

    element.querySelector<HTMLButtonElement>('[aria-label^="Actions sur le son du 12"]')!.click();
    expect(asked).toEqual([oldest]);
  });
});
