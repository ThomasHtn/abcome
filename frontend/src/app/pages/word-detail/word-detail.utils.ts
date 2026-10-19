import {
  formatLongDate,
  formatShortDate,
  formatShortDateWithYear,
  todayIso,
} from '@core/date/date.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { formatDurationInWords } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus, Recording, Word } from '@core/words/word.model';
import { sortPronunciations } from '@core/words/word.utils';

import { LONG_TITLE_LENGTH, VERY_LONG_TITLE_LENGTH } from './word-detail.constants';
import { GallerySound, SoundSheetCopy, TimelineStage, TitleLength } from './word-detail.model';

/**
 * Title of the stage at `index` (oldest first) among `count`: the first time, the latest, or its rank.
 * The latest says "Aujourd'hui" only when it was really heard today, "Maintenant" otherwise.
 */
export function stageTitle(index: number, count: number, date: string, today: string): string {
  if (index === 0) {
    return 'Première fois';
  }
  if (index === count - 1) {
    return date === today ? "Aujourd'hui" : 'Maintenant';
  }
  return `Étape ${index + 1}`;
}

/**
 * The word's stages for the timeline, newest first, as the mockup shows its progress, each with its sounds.
 */
export function timelineStages(word: Word, today: string): TimelineStage[] {
  const stages = sortPronunciations(word.pronunciations);
  const sounds = gallerySounds(word.recordings, today);
  return stages
    .map((pronunciation, index) => {
      const title = stageTitle(index, stages.length, pronunciation.date, today);
      const date = formatShortDateWithYear(pronunciation.date);
      return {
        pronunciation,
        title,
        caption: `${title} · ${date}`,
        ariaLabel:
          `${title}\u00A0: ${pronunciation.spoken}, ${STATUS_LABELS[pronunciation.status]}, ` +
          `le ${formatLongDate(pronunciation.date)}. Modifier`,
        latest: index === stages.length - 1,
        oldest: index === 0,
        sounds: sounds.filter((sound) => sound.recording.pronunciationId === pronunciation.id),
        soundsLabel: `Sons de ${quote(pronunciation.spoken)}`,
      };
    })
    .reverse();
}

/**
 * Main button: "Il le dit mieux !" while there is progress to make, a plain add once mastered.
 */
export function progressLabel(status: PronunciationStatus): string {
  return status === 'mastered' ? 'Ajouter une prononciation' : 'Il le dit mieux\u00A0!';
}

/**
 * Label of the day in the stage form: the first stage is "the first time", any other one was heard.
 */
export function stageDateLabel(firstStage: boolean): string {
  return firstStage ? 'Dit pour la première fois le' : 'Entendu le';
}

/**
 * Whether a change made the word "Bien dit", the moment the mockup celebrates.
 */
export function turnedMastered(before: PronunciationStatus, after: PronunciationStatus): boolean {
  return before !== 'mastered' && after === 'mastered';
}

/**
 * The word's sounds, in the API order (newest first), dated in the family's zone; the year is said
 * only when it is not the one of `today`.
 */
export function gallerySounds(recordings: readonly Recording[], today: string): GallerySound[] {
  const currentYear = Number.parseInt(today.slice(0, 4), 10);
  return recordings.map((recording) => {
    const day = todayIso(new Date(recording.createdAt));
    const recordedOn = formatLongDate(day, currentYear);
    const length = formatDurationInWords(recording.durationMs);
    // The length tells apart two sounds of the same day.
    const name = `le son enregistré le ${recordedOn}, ${length}`;
    return {
      recording,
      src: API_ENDPOINTS.recording(recording.id),
      day: formatShortDate(day),
      recordedOn,
      length,
      listenLabel: `Écouter ${name}`,
      actionsLabel: `Actions sur ${name}`,
    };
  });
}

/**
 * Title size for `label`, so a long word fits the hero without being cut in every syllable.
 */
export function titleLength(label: string): TitleLength {
  if (label.length > VERY_LONG_TITLE_LENGTH) {
    return 'very-long';
  }
  return label.length > LONG_TITLE_LENGTH ? 'long' : 'normal';
}

/**
 * Actions sheet of a sound: named by its day, described by what the child says on it and its length.
 */
export function soundSheetCopy(
  sound: GallerySound,
  spoken: string,
  childName: string,
): SoundSheetCopy {
  return {
    heading: `Son enregistré le ${sound.recordedOn}`,
    text: `${childName} y dit ${quote(spoken)}. Il dure ${sound.length}.`,
  };
}

/**
 * Consequence of deleting a sound, naming it the way the actions sheet does.
 */
export function removeSoundText(sound: GallerySound, spoken: string, childName: string): string {
  return (
    `Le son enregistré le ${sound.recordedOn}, où ${childName} dit ${quote(spoken)}, sera effacé. ` +
    'On ne pourra pas revenir en arrière.'
  );
}

/**
 * Consequence of removing a stage: the API keeps its sounds and files them under `heirSpoken`'s stage,
 * so the family knows where to find them; no word on sounds when there is none.
 */
export function removeStageText(
  date: string,
  soundCount: number,
  heirSpoken: string | undefined,
): string {
  const sentences = [`Cette prononciation du ${formatLongDate(date)} sera effacée.`];
  if (soundCount > 0 && heirSpoken !== undefined) {
    sentences.push(
      soundCount === 1
        ? `Le son de cette prononciation sera rangé avec ${quote(heirSpoken)}.`
        : `Ses ${soundCount} sons seront rangés avec ${quote(heirSpoken)}.`,
    );
  }
  sentences.push('On ne pourra pas revenir en arrière.');
  return sentences.join(' ');
}
