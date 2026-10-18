import { aPronunciation, aWord } from '@core/words/word.fixtures';

import {
  doneCopy,
  liveBars,
  microphoneErrorKind,
  recordingInstruction,
  recordingTitle,
  rmsLevel,
  saveButtonText,
  stageOptions,
  summarizeLevels,
} from './recording-new.utils';

describe('recording-new utils', () => {
  it('measures silence as zero and a loud wave up to one', () => {
    expect(rmsLevel(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(rmsLevel(new Uint8Array([0, 255, 0, 255]))).toBe(1);
    expect(rmsLevel(new Uint8Array([]))).toBe(0);
    const quiet = rmsLevel(new Uint8Array([118, 138, 118, 138]));
    expect(quiet).toBeGreaterThan(0);
    expect(quiet).toBeLessThan(0.5);
  });

  it('keeps the last levels for the live bars, silence first while filling', () => {
    expect(liveBars([0.5, 0.7], 4)).toEqual([0, 0, 0.5, 0.7]);
    expect(liveBars([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });

  it('sums a recording up into bars, keeping the loudest sample of each slice', () => {
    expect(summarizeLevels([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
    expect(summarizeLevels([0.3], 3)).toEqual([0.3, 0.3, 0.3]);
    expect(summarizeLevels([], 2)).toEqual([0, 0]);
  });

  it('tells a refused microphone from a missing one', () => {
    expect(microphoneErrorKind(new DOMException('no', 'NotAllowedError'))).toBe('denied');
    expect(microphoneErrorKind(new DOMException('none', 'NotFoundError'))).toBe('missing');
    expect(microphoneErrorKind(new Error('boom'))).toBe('failed');
    expect(microphoneErrorKind('weird')).toBe('failed');
  });

  it('words the instruction and the title of each step', () => {
    expect(recordingInstruction('ready')).toContain('Touche le micro');
    expect(recordingInstruction('recording')).toContain('carré rouge');
    expect(recordingInstruction('review')).toContain('Écoute le son');
    expect(recordingTitle('ready', true)).toBe('Enregistrer un son');
    expect(recordingTitle('pick', true)).toBe('Associer le son');
    expect(recordingTitle('done', true)).toBe("C'est fait");
  });

  it('closes with a message matching what was saved', () => {
    const base = { label: 'lapin', wordId: 1 };
    expect(doneCopy({ ...base, kind: 'new', spoken: 'apin', soundCount: 1 })).toEqual({
      title: '«\u00A0lapin\u00A0» est dans ses mots\u00A0!',
      text: "Côme le dit «\u00A0apin\u00A0». Son premier son t'attend sur sa page.",
    });
    expect(doneCopy({ ...base, kind: 'added', spoken: '', soundCount: 3 })).toEqual({
      title: 'Son ajouté à «\u00A0lapin\u00A0»\u00A0!',
      text: 'Il a maintenant 3 sons. Tu les retrouves sur sa page.',
    });
    expect(doneCopy({ ...base, kind: 'stage', spoken: 'lapin', soundCount: 2 })).toEqual({
      title: 'Nouvelle prononciation de «\u00A0lapin\u00A0»\u00A0!',
      text: "Côme le dit «\u00A0lapin\u00A0». Le son l'accompagne sur sa page.",
    });
    expect(doneCopy({ ...base, kind: 'added', spoken: '', soundCount: 1 }).text).toBe(
      'Tu le retrouves sur sa page.',
    );
  });

  it('words the save button of a new word or stage', () => {
    expect(saveButtonText(false, true)).toBe("Note d'abord ce qu'il dit");
    expect(saveButtonText(true, true)).toBe('Enregistrer le mot');
    expect(saveButtonText(true, false)).toBe('Enregistrer la prononciation');
  });

  it('offers the stages of a word newest first, the current one titled', () => {
    const options = stageOptions(
      aWord({
        pronunciations: [
          aPronunciation({ id: 2, spoken: 'apin', status: 'almost', date: '2026-10-12' }),
          aPronunciation({ id: 1, spoken: 'pin', status: 'learning', date: '2026-09-16' }),
        ],
      }),
    );

    expect(options.map((option) => option.caption)).toEqual([
      'Maintenant · 12 oct. 2026',
      '16 sept. 2026',
    ]);
    expect(options[1].ariaLabel).toBe('pin, En route, le 16 septembre 2026');
  });

  it('titles the note step after what it notes', () => {
    expect(recordingTitle('note', true)).toBe('Nouveau mot');
    expect(recordingTitle('note', false)).toBe('Nouvelle prononciation');
    expect(recordingTitle('stage', false)).toBe('Associer le son');
  });
});
