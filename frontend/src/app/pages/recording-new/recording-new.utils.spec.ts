import {
  doneCopy,
  liveBars,
  microphoneErrorKind,
  recordingInstruction,
  recordingTitle,
  rmsLevel,
  saveButtonText,
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
    expect(recordingTitle('ready')).toBe('Enregistrer un son');
    expect(recordingTitle('pick')).toBe('Associer le son');
    expect(recordingTitle('note')).toBe('Nouveau mot');
    expect(recordingTitle('done')).toBe("C'est fait");
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
    expect(doneCopy({ ...base, kind: 'added', spoken: '', soundCount: 1 }).text).toBe(
      'Tu le retrouves sur sa page.',
    );
  });

  it('words the save button of a new word', () => {
    expect(saveButtonText(false)).toBe("Note d'abord ce qu'il dit");
    expect(saveButtonText(true)).toBe('Enregistrer le mot');
  });
});
