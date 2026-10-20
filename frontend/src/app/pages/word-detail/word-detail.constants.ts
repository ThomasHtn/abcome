import { WordKind } from '@core/words/word.model';

import { KindCopy, WordSheet } from './word-detail.model';

/**
 * Translation keys of the page wording for a word and for a sentence, translated by `translatedCopy`.
 */
export const KIND_COPY: Readonly<Record<WordKind, KindCopy>> = {
  word: {
    deleteAction: 'wordDetail.word.deleteAction',
    renameAction: 'wordDetail.word.renameAction',
    deletedSuffix: 'wordDetail.word.deletedSuffix',
    notFound: 'wordDetail.word.notFound',
    loading: 'wordDetail.word.loading',
    renamed: 'wordDetail.word.renamed',
    emptyLabel: 'wordDetail.word.emptyLabel',
    labelField: 'wordDetail.word.labelField',
    renameFailed: 'wordDetail.word.renameFailed',
    deleteFailed: 'wordDetail.word.deleteFailed',
    lastStageMessage: 'wordDetail.word.lastStageMessage',
    listQuery: {},
  },
  sentence: {
    deleteAction: 'wordDetail.sentence.deleteAction',
    renameAction: 'wordDetail.sentence.renameAction',
    deletedSuffix: 'wordDetail.sentence.deletedSuffix',
    notFound: 'wordDetail.sentence.notFound',
    loading: 'wordDetail.sentence.loading',
    renamed: 'wordDetail.sentence.renamed',
    emptyLabel: 'wordDetail.sentence.emptyLabel',
    labelField: 'wordDetail.sentence.labelField',
    renameFailed: 'wordDetail.sentence.renameFailed',
    deleteFailed: 'wordDetail.sentence.deleteFailed',
    lastStageMessage: 'wordDetail.sentence.lastStageMessage',
    listQuery: { tab: 'sentences' },
  },
};

/**
 * Confirmation sheets: they cannot show an error inside, so a failure closes them before its toast.
 */
export const CONFIRM_SHEETS: readonly WordSheet[] = ['last-stage'];

/**
 * Sheet that a confirmation goes back to on "Garder", so the edits in progress there are kept.
 */
export const PARENT_SHEETS: Readonly<Partial<Record<WordSheet, WordSheet>>> = {
  'last-stage': 'stage',
};

/**
 * Beyond this many characters, the word's title takes the smaller "long" size.
 */
export const LONG_TITLE_LENGTH = 12;

/**
 * Beyond this many characters, the word's title takes the smallest size.
 */
export const VERY_LONG_TITLE_LENGTH = 22;
