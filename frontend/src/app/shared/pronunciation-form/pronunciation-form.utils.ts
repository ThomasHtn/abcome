import { todayIso } from '@core/date/date.utils';
import { SPOKEN_MAX_LENGTHS } from '@core/words/word.constants';
import {
  Pronunciation,
  PronunciationRequest,
  PronunciationStatus,
  WordKind,
} from '@core/words/word.model';
import { dateFieldError } from '@shared/date-field/date-field.utils';

import { PronunciationDraft } from './pronunciation-form.model';

/**
 * Blank draft dated today; `status` defaults to "Presque", the middle choice.
 */
export function emptyDraft(
  status: PronunciationStatus = 'almost',
  date = todayIso(),
): PronunciationDraft {
  return { spoken: '', status, date };
}

/**
 * Draft prefilled from an existing stage, to edit it.
 */
export function draftOf(pronunciation: Pronunciation): PronunciationDraft {
  return { spoken: pronunciation.spoken, status: pronunciation.status, date: pronunciation.date };
}

/**
 * Whether the draft can be saved: something written within the API's length for the kind, on a valid day.
 */
export function isDraftReady(
  draft: PronunciationDraft,
  today: string = todayIso(),
  kind: WordKind = 'word',
): boolean {
  const spoken = draft.spoken.trim();
  return (
    spoken.length > 0 &&
    spoken.length <= SPOKEN_MAX_LENGTHS[kind] &&
    dateFieldError(draft.date, today) === null
  );
}

/**
 * Body the API expects, the spoken form trimmed.
 */
export function toPronunciationRequest(draft: PronunciationDraft): PronunciationRequest {
  return { spoken: draft.spoken.trim(), status: draft.status, date: draft.date };
}
