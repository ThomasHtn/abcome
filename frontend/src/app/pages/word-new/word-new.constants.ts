import { WordCategory } from '@core/words/word.model';
import { IconName } from '@shared/icon/icon.model';

/**
 * Picture of each category on the chosen word's tile, so the kind of word reads at a glance.
 */
export const CATEGORY_ICONS: Readonly<Record<WordCategory, IconName>> = {
  sounds: 'audio-lines',
  games_routines: 'party-popper',
  vehicles: 'car',
  animals: 'paw-print',
  toys: 'toy-brick',
  clothing: 'shirt',
  outside: 'trees',
  places: 'map-pin',
  household: 'lamp',
  body_parts: 'hand',
  food_drink: 'apple',
  furniture_rooms: 'sofa',
  people: 'users',
  descriptive_words: 'palette',
  action_words: 'footprints',
  time_words: 'clock',
  helping_verbs: 'puzzle',
  question_words: 'circle-question-mark',
  prepositions: 'move',
  quantifiers: 'layers',
  pronouns: 'user-round',
  connecting_words: 'link',
  custom: 'heart',
};
