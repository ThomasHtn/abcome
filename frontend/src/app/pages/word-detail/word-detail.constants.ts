import { WordKind } from '@core/words/word.model';

import { KindCopy, WordSheet } from './word-detail.model';

/**
 * Wording of the page for a word and for a sentence.
 */
export const KIND_COPY: Readonly<Record<WordKind, KindCopy>> = {
  word: {
    theNoun: 'le mot',
    deletedSuffix: 'a été supprimé',
    notFound: "Ce mot n'est pas dans le carnet",
    loading: 'Chargement du mot…',
    renamed: 'Mot renommé',
    emptyLabel: 'Écris le mot.',
    labelField: 'Le mot',
    renameFailed: "Le mot n'a pas pu être renommé, réessaie.",
    deleteFailed: "Le mot n'a pas pu être supprimé, réessaie.",
    lastStageMessage:
      "Un mot garde toujours au moins une prononciation. Pour l'effacer, supprime le mot.",
    listQuery: {},
  },
  sentence: {
    theNoun: 'la phrase',
    deletedSuffix: 'a été supprimée',
    notFound: "Cette phrase n'est pas dans le carnet",
    loading: 'Chargement de la phrase…',
    renamed: 'Phrase modifiée',
    emptyLabel: "Écris ce qu'il voulait dire.",
    labelField: "Ce qu'il voulait dire",
    renameFailed: "La phrase n'a pas pu être modifiée, réessaie.",
    deleteFailed: "La phrase n'a pas pu être supprimée, réessaie.",
    lastStageMessage:
      "Une phrase garde toujours au moins une prononciation. Pour l'effacer, supprime la phrase.",
    listQuery: { onglet: 'phrases' },
  },
};

/**
 * Confirmation sheets: they cannot show an error inside, so a failure closes them before its toast.
 */
export const CONFIRM_SHEETS: readonly WordSheet[] = [
  'remove-stage',
  'last-stage',
  'delete',
  'remove-sound',
];

/**
 * Beyond this many characters, the word's title takes the smaller "long" size.
 */
export const LONG_TITLE_LENGTH = 12;

/**
 * Beyond this many characters, the word's title takes the smallest size.
 */
export const VERY_LONG_TITLE_LENGTH = 22;
