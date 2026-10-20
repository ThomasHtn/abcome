import { translate } from '@jsverse/transloco';

import { ageInMonths, atAge, formatLongDate } from '@core/date/date.utils';
import { quote } from '@core/text/text.utils';
import { Word } from '@core/words/word.model';
import { entriesOfKind, firstSaidDate, sortByFirstSaidDesc } from '@core/words/word.utils';

import { MILESTONE_TITLES, WORD_STEP_AFTER, WORD_STEPS } from './milestone.constants';
import { Milestone, MilestoneStory } from './milestone.model';

/**
 * Word counts celebrated up to `total` words: 10, 50, 100, then every 50.
 */
export function wordSteps(total: number): number[] {
  const steps = WORD_STEPS.filter((step) => step <= total);
  const last = WORD_STEPS.at(-1) ?? 0;
  for (let step = last + WORD_STEP_AFTER; step <= total; step += WORD_STEP_AFTER) {
    steps.push(step);
  }
  return steps;
}

/**
 * Next word count to celebrate after `count` words.
 */
export function nextWordStep(count: number): number {
  const next = WORD_STEPS.find((step) => step > count);
  if (next !== undefined) {
    return next;
  }
  const last = WORD_STEPS.at(-1) ?? 0;
  return last + (Math.floor((count - last) / WORD_STEP_AFTER) + 1) * WORD_STEP_AFTER;
}

/**
 * Every milestone the notebook holds, oldest first: each word count reached (the Nth word in the
 * order first said), the first stage said well, the first sentence. Derived again on each change, so
 * a word dated afterwards simply moves the milestone to the right word.
 */
export function milestonesOf(entries: readonly Word[]): Milestone[] {
  const words = sortByFirstSaidDesc(entriesOfKind(entries, 'word')).reverse();
  const milestones: Milestone[] = wordSteps(words.length).map((count) => {
    const entry = words[count - 1];
    return { key: `words-${count}`, kind: 'words', count, entry, date: firstSaidDate(entry) };
  });
  const mastered = firstMastered(words);
  if (mastered) {
    milestones.push(mastered);
  }
  const [sentence] = sortByFirstSaidDesc(entriesOfKind(entries, 'sentence')).reverse();
  if (sentence) {
    milestones.push({
      key: 'first-sentence',
      kind: 'first-sentence',
      count: null,
      entry: sentence,
      date: firstSaidDate(sentence),
    });
  }
  return milestones.sort((first, second) => first.date.localeCompare(second.date));
}

/**
 * The first stage marked "Bien dit" among the words, by day then by the order it was noted.
 */
function firstMastered(words: readonly Word[]): Milestone | null {
  let best: Milestone | null = null;
  let bestId = Number.POSITIVE_INFINITY;
  for (const entry of words) {
    for (const stage of entry.pronunciations) {
      const earlier =
        !best || stage.date < best.date || (stage.date === best.date && stage.id < bestId);
      if (stage.status === 'mastered' && earlier) {
        best = {
          key: 'first-mastered',
          kind: 'first-mastered',
          count: null,
          entry,
          date: stage.date,
        };
        bestId = stage.id;
      }
    }
  }
  return best;
}

/**
 * Name of a milestone ("10 mots", "Premier « Bien dit »").
 */
export function milestoneTitle(milestone: Milestone): string {
  return translate(MILESTONE_TITLES[milestone.kind], { count: milestone.count });
}

/**
 * When it happened: the child's age when his birth date is known ("à 17 mois"), else the day
 * ("le 18 octobre"), the year shown when not `currentYear`.
 */
export function milestoneWhen(
  milestone: Milestone,
  birthDate: string | null,
  currentYear: number,
): string {
  return birthDate
    ? atAge(ageInMonths(birthDate, milestone.date))
    : translate('milestones.onDay', { date: formatLongDate(milestone.date, currentYear) });
}

/**
 * Line of the list marker ("10 mots, à 17 mois").
 */
export function markerLabel(
  milestone: Milestone,
  birthDate: string | null,
  currentYear: number,
): string {
  return translate('milestones.marker', {
    title: milestoneTitle(milestone),
    when: milestoneWhen(milestone, birthDate, currentYear),
  });
}

/**
 * What the drawer says around the entry, split so the entry's label can be styled between
 * ("Avec " / « non » / ", Côme passe le cap des 10 mots, à 17 mois.").
 */
export function milestoneStory(
  milestone: Milestone,
  childName: string,
  when: string,
): MilestoneStory {
  const params = { childName, when, count: milestone.count };
  const keys = {
    words: 'milestones.story.words',
    'first-mastered': 'milestones.story.firstMastered',
    'first-sentence': 'milestones.story.firstSentence',
  }[milestone.kind];
  return {
    before: translate(`${keys}Before`, params),
    entry: quote(milestone.entry.label),
    after: translate(`${keys}After`, params),
  };
}
