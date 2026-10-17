import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { aRecording } from '@core/words/word.fixtures';
import { Recording } from '@core/words/word.model';

import { gallerySounds } from '../word-detail.utils';
import { SoundGallery } from './sound-gallery';

describe('SoundGallery', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  /**
   * Renders the gallery for the given sounds of «\u00A0lapin\u00A0».
   */
  function render(recordings: Recording[]) {
    const fixture = TestBed.createComponent(SoundGallery);
    fixture.componentRef.setInput('sounds', gallerySounds(recordings));
    fixture.componentRef.setInput('label', 'lapin');
    fixture.componentRef.setInput('wordId', 4);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the sounds newest first with their count, and asks to delete one', () => {
    const newest = aRecording({ id: 2, createdAt: '2026-10-17T09:00:00Z', durationMs: 3000 });
    const oldest = aRecording({ id: 1, createdAt: '2026-10-12T09:00:00Z', durationMs: 5000 });
    const fixture = render([newest, oldest]);
    const element = fixture.nativeElement as HTMLElement;
    const removed: Recording[] = [];
    fixture.componentInstance.remove.subscribe((recording) => removed.push(recording));

    expect(element.querySelector('.sound-gallery__count')?.textContent).toBe('2');
    const captions = [...element.querySelectorAll('.sound-gallery__caption')].map((caption) =>
      caption.textContent?.trim(),
    );
    expect(captions).toEqual(['17 oct. · 0:03', '12 oct. · 0:05']);

    element.querySelector<HTMLButtonElement>('[aria-label^="Supprimer le son du 12"]')!.click();
    expect(removed).toEqual([oldest]);
  });

  it('invites to record the first sound of the word when there is none', () => {
    const element = render([]).nativeElement as HTMLElement;

    expect(element.querySelector('.sound-gallery__count')).toBeNull();
    expect(element.textContent).toContain('«\u00A0lapin\u00A0»');
    const link = element.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('href')).toBe('/sons/nouveau?mot=4');
  });
});
