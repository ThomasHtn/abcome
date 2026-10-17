import { PronunciationStatus, WordCategory } from './word.model';

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
 * Longest word label the API accepts.
 */
export const WORD_LABEL_MAX_LENGTH = 40;

/**
 * Longest spoken form the API accepts.
 */
export const SPOKEN_MAX_LENGTH = 60;
