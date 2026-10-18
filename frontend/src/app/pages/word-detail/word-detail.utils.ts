import {
  formatLongDate,
  formatShortDate,
  formatShortDateWithYear,
  todayIso,
} from '@core/date/date.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { formatRecordingClock } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { STATUS_LABELS } from '@core/words/word.constants';
import { PronunciationStatus, Recording, Word } from '@core/words/word.model';
import { sortPronunciations } from '@core/words/word.utils';

import { LONG_TITLE_LENGTH, VERY_LONG_TITLE_LENGTH } from './word-detail.constants';
import { GallerySound, TimelineStage, TitleLength } from './word-detail.model';

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
  const sounds = gallerySounds(word.recordings);
  return stages
    .map((pronunciation, index) => {
      const title = stageTitle(index, stages.length, pronunciation.date, today);
      const date = formatShortDateWithYear(pronunciation.date);
      const latest = index === stages.length - 1;
      const oldest = index === 0;
      return {
        pronunciation,
        title,
        caption: oldest || latest ? `${title} · ${date}` : date,
        ariaLabel:
          `${title} : ${pronunciation.spoken}, ${STATUS_LABELS[pronunciation.status]}, ` +
          `le ${formatLongDate(pronunciation.date)}. Modifier`,
        latest,
        oldest,
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
  return status === 'mastered' ? 'Ajouter une prononciation' : 'Il le dit mieux !';
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
 * The word's sounds, in the API order (newest first), dated in the family's zone.
 */
export function gallerySounds(recordings: readonly Recording[]): GallerySound[] {
  return recordings.map((recording) => {
    const day = todayIso(new Date(recording.createdAt));
    // Rounded to the nearest second, at least one, so a short sound never reads "0:00".
    const length = formatRecordingClock(
      Math.max(1, Math.round(recording.durationMs / 1000)) * 1000,
    );
    const description = `du ${formatLongDate(day)} (${length})`;
    return {
      recording,
      src: API_ENDPOINTS.recording(recording.id),
      day: formatShortDate(day),
      description,
      listenLabel: `Écouter le son ${description}`,
      actionsLabel: `Actions sur le son ${description}`,
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
