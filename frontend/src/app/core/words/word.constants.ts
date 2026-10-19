import { PronunciationStatus, WordCategory, WordKind } from './word.model';

/**
 * Statuses from furthest to closest, the order of every picker and filter.
 */
export const PRONUNCIATION_STATUSES: readonly PronunciationStatus[] = [
  'learning',
  'almost',
  'mastered',
];

/**
 * French label of each status, the only place the UI wording lives.
 */
export const STATUS_LABELS: Readonly<Record<PronunciationStatus, string>> = {
  learning: 'En route',
  almost: 'Presque',
  mastered: 'Bien dit',
};

/**
 * French label of each category, as shown under a chosen word.
 */
export const CATEGORY_LABELS: Readonly<Record<WordCategory, string>> = {
  sounds: 'bruits et onomatopées',
  games_routines: 'jeux et routines',
  vehicles: 'véhicules',
  animals: 'animaux',
  toys: 'jouets',
  clothing: 'vêtements',
  outside: 'dehors',
  places: 'lieux',
  household: 'objets de la maison',
  body_parts: 'corps',
  food_drink: 'à manger et à boire',
  furniture_rooms: 'meubles et pièces',
  people: 'personnes',
  descriptive_words: 'mots pour décrire',
  action_words: 'actions',
  time_words: 'le temps',
  helping_verbs: 'petits verbes',
  question_words: 'questions',
  prepositions: 'petits mots de lieu',
  quantifiers: 'quantités',
  pronouns: 'pronoms',
  connecting_words: 'mots de liaison',
  custom: 'mot perso',
};

/**
 * Longest label the API accepts, per kind: a word, or what a sentence means.
 */
export const LABEL_MAX_LENGTHS: Readonly<Record<WordKind, number>> = { word: 40, sentence: 200 };

/**
 * Longest spoken form the API accepts, per kind.
 */
export const SPOKEN_MAX_LENGTHS: Readonly<Record<WordKind, number>> = { word: 60, sentence: 200 };

/**
 * Browser storage key of what this device has seen (entry ids and instants only).
 */
export const SEEN_STORAGE_KEY = 'abcome.seen';

/**
 * How long an unseen change stays marked: 14 days, so a device seldom opened is not covered in tags.
 */
export const CHANGE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
