import { aPronunciation, aRecording, aWord } from '@core/words/word.fixtures';

import {
  gallerySounds,
  progressLabel,
  soundSheetCopy,
  stageDateLabel,
  stageTitle,
  timelineStages,
  titleLength,
  turnedMastered,
} from './word-detail.utils';

describe('word-detail utils', () => {
  const lapin = aWord({
    id: 1,
    pronunciations: [
      aPronunciation({ id: 3, spoken: 'lapin', status: 'mastered', date: '2026-10-17' }),
      aPronunciation({ id: 1, spoken: 'pin', status: 'learning', date: '2026-09-16' }),
      aPronunciation({ id: 2, spoken: 'apin', status: 'almost', date: '2026-10-12' }),
    ],
  });

  it('titles the first stage, the latest and the ones between', () => {
    expect(stageTitle(0, 3, '2026-09-16', '2026-10-17')).toBe('Première fois');
    expect(stageTitle(1, 3, '2026-10-12', '2026-10-17')).toBe('Étape 2');
    expect(stageTitle(2, 3, '2026-10-17', '2026-10-17')).toBe("Aujourd'hui");
    expect(stageTitle(2, 3, '2026-10-12', '2026-10-17')).toBe('Maintenant');
    expect(stageTitle(0, 1, '2026-10-17', '2026-10-17')).toBe('Première fois');
  });

  it('lists the stages newest first with their captions', () => {
    const stages = timelineStages(lapin, '2026-10-17');
    expect(stages.map((stage) => stage.caption)).toEqual([
      "Aujourd'hui · 17 oct. 2026",
      'Étape 2 · 12 oct. 2026',
      'Première fois · 16 sept. 2026',
    ]);
    expect(stages.map((stage) => [stage.latest, stage.oldest])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('files each sound under its stage, newest first, and names the list after the spoken form', () => {
    const withSounds = {
      ...lapin,
      recordings: [
        aRecording({ id: 3, pronunciationId: 3 }),
        aRecording({ id: 2, pronunciationId: 2 }),
        aRecording({ id: 1, pronunciationId: 3 }),
      ],
    };
    const stages = timelineStages(withSounds, '2026-10-17');

    expect(stages.map((stage) => stage.sounds.map((sound) => sound.recording.id))).toEqual([
      [3, 1],
      [2],
      [],
    ]);
    expect(stages[2].soundsLabel).toBe('Sons de «\u00A0pin\u00A0»');
  });

  it('names each stage button with what, how well, when, and the action', () => {
    expect(timelineStages(lapin, '2026-10-17')[2].ariaLabel).toBe(
      'Première fois\u00A0: pin, En route, le 16 septembre 2026. Modifier',
    );
  });

  it('words the main button after the current status', () => {
    expect(progressLabel('almost')).toBe('Il le dit mieux\u00A0!');
    expect(progressLabel('mastered')).toBe('Ajouter une prononciation');
  });

  it('labels the day of the first stage differently', () => {
    expect(stageDateLabel(true)).toBe('Dit pour la première fois le');
    expect(stageDateLabel(false)).toBe('Entendu le');
  });

  it('celebrates only a change into "Bien dit"', () => {
    expect(turnedMastered('almost', 'mastered')).toBe(true);
    expect(turnedMastered('mastered', 'mastered')).toBe(false);
    expect(turnedMastered('mastered', 'almost')).toBe(false);
  });

  it('dates each sound in Paris and rounds its length, keeping the API order', () => {
    const sounds = gallerySounds(
      [
        aRecording({ id: 2, createdAt: '2026-10-16T22:30:00Z', durationMs: 3400 }),
        aRecording({ id: 1, createdAt: '2025-09-16T08:00:00Z', durationMs: 300 }),
      ],
      '2026-10-18',
    );

    expect(sounds.map((sound) => sound.recording.id)).toEqual([2, 1]);
    expect(sounds[0].src).toBe('/api/recordings/2');
    expect(sounds[0].day).toBe('17 oct.');
    expect(sounds[0].recordedOn).toBe('17 octobre');
    expect(sounds[1].recordedOn).toBe('16 septembre 2025');
    expect(sounds[0].length).toBe('3 secondes');
    expect(sounds[0].listenLabel).toBe('Écouter le son enregistré le 17 octobre, 3 secondes');
    expect(sounds[0].actionsLabel).toBe('Actions sur le son enregistré le 17 octobre, 3 secondes');
    expect(sounds[1].length).toBe('1 seconde');
    expect(sounds[1].day).toBe('16 sept.');
  });
});

describe('titleLength', () => {
  it('keeps the large title for a short word', () => {
    expect(titleLength('lapin')).toBe('normal');
    expect(titleLength('a'.repeat(12))).toBe('normal');
  });

  it('shrinks the title as the word grows', () => {
    expect(titleLength('a'.repeat(13))).toBe('long');
    expect(titleLength('a'.repeat(22))).toBe('long');
    expect(titleLength('anticonstitutionnellement')).toBe('very-long');
  });

  it('names a sound by its day and says what the child says on it', () => {
    const [sound] = gallerySounds(
      [aRecording({ id: 2, createdAt: '2026-10-16T22:30:00Z', durationMs: 3400 })],
      '2026-10-18',
    );

    expect(soundSheetCopy(sound, 'apin', 'Alix')).toEqual({
      heading: 'Son enregistré le 17 octobre',
      text: 'Alix y dit «\u00A0apin\u00A0». Il dure 3 secondes.',
    });
  });
});
