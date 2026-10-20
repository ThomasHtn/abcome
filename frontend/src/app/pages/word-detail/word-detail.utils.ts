import { translate } from '@jsverse/transloco';

import {
  formatLongDate,
  formatShortDate,
  formatShortDateWithYear,
  todayIso,
} from '@core/date/date.utils';
import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { formatDurationInWords } from '@core/recordings/recording.utils';
import { quote } from '@core/text/text.utils';
import { PronunciationStatus, Recording, Word } from '@core/words/word.model';
import { sortPronunciations, statusLabel } from '@core/words/word.utils';

import { LONG_TITLE_LENGTH, VERY_LONG_TITLE_LENGTH } from './word-detail.constants';
import {
  GallerySound,
  KindCopy,
  SoundSheetCopy,
  TimelineStage,
  TitleLength,
} from './word-detail.model';

/**
 * Wording of the page with every key of `keys` translated; the list query passes through.
 */
export function translatedCopy(keys: KindCopy): KindCopy {
  return {
    deleteAction: translate(keys.deleteAction),
    renameAction: translate(keys.renameAction),
    deletedSuffix: translate(keys.deletedSuffix),
    notFound: translate(keys.notFound),
    loading: translate(keys.loading),
    renamed: translate(keys.renamed),
    emptyLabel: translate(keys.emptyLabel),
    labelField: translate(keys.labelField),
    renameFailed: translate(keys.renameFailed),
    deleteFailed: translate(keys.deleteFailed),
    lastStageMessage: translate(keys.lastStageMessage),
    listQuery: keys.listQuery,
  };
}

/**
 * Title of the stage at `index` (oldest first) among `count`: the first time, the latest, or its rank.
 * The latest says "Aujourd'hui" only when it was really heard today, "Maintenant" otherwise.
 */
export function stageTitle(index: number, count: number, date: string, today: string): string {
  if (index === 0) {
    return translate('wordDetail.stageFirst');
  }
  if (index === count - 1) {
    return date === today ? translate('wordDetail.stageToday') : translate('wordDetail.stageNow');
  }
  return translate('wordDetail.stageNumber', { number: index + 1 });
}

/**
 * The word's stages for the timeline, newest first so the latest progress leads, each with its sounds.
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
        ariaLabel: translate('wordDetail.stageAriaLabel', {
          title,
          spoken: pronunciation.spoken,
          status: statusLabel(pronunciation.status),
          date: formatLongDate(pronunciation.date),
        }),
        latest: index === stages.length - 1,
        oldest: index === 0,
        sounds: sounds.filter((sound) => sound.recording.pronunciationId === pronunciation.id),
        soundsLabel: translate('wordDetail.stageSoundsLabel', {
          spoken: quote(pronunciation.spoken),
        }),
      };
    })
    .reverse();
}

/**
 * Main button: "Il le dit mieux !" while there is progress to make, a plain add once mastered.
 */
export function progressLabel(status: PronunciationStatus): string {
  return status === 'mastered'
    ? translate('wordDetail.progressAdd')
    : translate('wordDetail.progressBetter');
}

/**
 * Label of the day in the stage form: the first stage is "the first time", any other one was heard.
 */
export function stageDateLabel(firstStage: boolean): string {
  return firstStage ? translate('wordDetail.dateFirstSaid') : translate('wordDetail.dateHeard');
}

/**
 * Whether a change made the word "Bien dit", the moment the app celebrates.
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
    return {
      recording,
      src: API_ENDPOINTS.recording(recording.id),
      day: formatShortDate(day),
      recordedOn,
      length,
      listenLabel: translate('wordDetail.soundListenLabel', { date: recordedOn, length }),
      actionsLabel: translate('wordDetail.soundActionsLabel', { date: recordedOn, length }),
    };
  });
}

/**
 * Screen reader name of a stage in the move sheet, read before its spoken form is shown.
 */
export function moveTargetLabel(stage: TimelineStage): string {
  return translate('wordDetail.moveTargetLabel', {
    spoken: stage.pronunciation.spoken,
    title: stage.title,
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
    heading: translate('wordDetail.soundSheetHeading', { date: sound.recordedOn }),
    text: translate('wordDetail.soundSheetText', {
      childName,
      spoken: quote(spoken),
      length: sound.length,
    }),
  };
}
