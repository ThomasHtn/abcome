/**
 * Icons of `public/assets/icons/icons.svg`, one per `<symbol>` id; keep both lists in step.
 */
export const ICON_NAMES = [
  'arrow-right',
  'calendar-days',
  'check',
  'chevron-left',
  'chevron-right',
  'circle-plus',
  'ellipsis',
  'eye',
  'eye-off',
  'list-ordered',
  'lock',
  'log-out',
  'mic',
  'pencil',
  'play',
  'plus',
  'rotate-ccw',
  'search',
  'square',
  'trash-2',
  'triangle-alert',
  'x',
] as const;

/**
 * Name of an icon of the sprite.
 */
export type IconName = (typeof ICON_NAMES)[number];
