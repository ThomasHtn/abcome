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
 * Translation key of each status label, the one place it is named; `statusLabel()` gives the text.
 */
export const STATUS_LABELS: Readonly<Record<PronunciationStatus, string>> = {
  learning: 'words.status.learning',
  almost: 'words.status.almost',
  mastered: 'words.status.mastered',
};

/**
 * Translation key of each category label, shown under a chosen word; `categoryLabel()` gives the text.
 */
export const CATEGORY_LABELS: Readonly<Record<WordCategory, string>> = {
  sounds: 'words.category.sounds',
  games_routines: 'words.category.gamesRoutines',
  vehicles: 'words.category.vehicles',
  animals: 'words.category.animals',
  toys: 'words.category.toys',
  clothing: 'words.category.clothing',
  outside: 'words.category.outside',
  places: 'words.category.places',
  household: 'words.category.household',
  body_parts: 'words.category.bodyParts',
  food_drink: 'words.category.foodDrink',
  furniture_rooms: 'words.category.furnitureRooms',
  people: 'words.category.people',
  descriptive_words: 'words.category.descriptiveWords',
  action_words: 'words.category.actionWords',
  time_words: 'words.category.timeWords',
  helping_verbs: 'words.category.helpingVerbs',
  question_words: 'words.category.questionWords',
  prepositions: 'words.category.prepositions',
  quantifiers: 'words.category.quantifiers',
  pronouns: 'words.category.pronouns',
  connecting_words: 'words.category.connectingWords',
  custom: 'words.category.custom',
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
export const SEEN_STORAGE_KEY = 'littlewords.seen';

/**
 * How long an unseen change stays marked: 14 days, so a device seldom opened is not covered in tags.
 */
export const CHANGE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
