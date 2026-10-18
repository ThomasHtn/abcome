import { aPronunciation, aWord } from '@core/words/word.fixtures';

import {
  doneCopy,
  isWholeClip,
  liveBars,
  microphoneErrorKind,
  moveTrimEdge,
  recordingInstruction,
  recordingTitle,
  rmsLevel,
  saveButtonText,
  spokenSeconds,
  stageOptions,
  summarizeLevels,
  trimClip,
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

  it('tells a refused microphone from a missing or busy one', () => {
    expect(microphoneErrorKind(new DOMException('no', 'NotAllowedError'))).toBe('denied');
    expect(microphoneErrorKind(new DOMException('none', 'NotFoundError'))).toBe('missing');
    expect(microphoneErrorKind(new DOMException('taken', 'NotReadableError'))).toBe('busy');
    expect(microphoneErrorKind(new DOMException('stopped', 'AbortError'))).toBe('busy');
    expect(microphoneErrorKind(new Error('boom'))).toBe('failed');
    expect(microphoneErrorKind('weird')).toBe('failed');
  });

  it('words the instruction and the title of each step', () => {
    expect(recordingInstruction('ready', false)).toContain('Touche le micro');
    expect(recordingInstruction('recording', false)).toContain('carré rouge');
    expect(recordingInstruction('review', false)).toContain('Recommence autant que tu veux');
    expect(recordingInstruction('review', true)).toBe(
      "15 secondes, c'est le maximum\u00A0: l'enregistrement s'est arrêté tout seul.",
    );
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

  it('moves a handle without crossing the other nor leaving the clip, keeping half a second', () => {
    const whole = { startMs: 0, endMs: 3000 };

    expect(moveTrimEdge(whole, 'start', 1234, 3000)).toEqual({ startMs: 1230, endMs: 3000 });
    expect(moveTrimEdge(whole, 'start', -200, 3000)).toEqual(whole);
    expect(moveTrimEdge(whole, 'start', 2900, 3000)).toEqual({ startMs: 2500, endMs: 3000 });
    expect(moveTrimEdge({ startMs: 1000, endMs: 3000 }, 'end', 1100, 3000)).toEqual({
      startMs: 1000,
      endMs: 1500,
    });
    expect(moveTrimEdge(whole, 'end', 9000, 3000)).toEqual(whole);
  });

  it('tells a whole clip from a trimmed one', () => {
    expect(isWholeClip({ startMs: 0, endMs: 3000 }, 3000)).toBe(true);
    expect(isWholeClip({ startMs: 10, endMs: 3000 }, 3000)).toBe(false);
    expect(isWholeClip({ startMs: 0, endMs: 2990 }, 3000)).toBe(false);
  });

  it('cuts the kept part into a WAV clip faded at its edges', async () => {
    const decoded = {
      samples: new Float32Array(1000).fill(0.5),
      sampleRate: 1000,
      durationMs: 1000,
    };

    const clip = trimClip(decoded, { startMs: 200, endMs: 800 });
    const view = new DataView(await clip.blob.arrayBuffer());

    expect(clip.blob.type).toBe('audio/wav');
    expect(clip.durationMs).toBe(600);
    expect(view.getUint32(40, true)).toBe(600 * 2);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(44 + 300 * 2, true)).toBe(16_383);
    expect(clip.levels.every((level) => level === 1)).toBe(true);
  });

  it('reads a handle position aloud in seconds', () => {
    expect(spokenSeconds(1440)).toBe('1,4 seconde');
    expect(spokenSeconds(2000)).toBe('2 secondes');
    expect(spokenSeconds(0)).toBe('0 seconde');
  });
});
