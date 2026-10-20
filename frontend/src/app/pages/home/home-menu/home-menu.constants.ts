/**
 * Gap between the "⋯" button and the menu below it, in pixels.
 */
export const MENU_OFFSET_PX = 8;

/**
 * Keys moving the focus between menu items, with the move each makes.
 */
export const MENU_KEY_MOVES: Readonly<Record<string, 'next' | 'previous' | 'first' | 'last'>> = {
  ArrowDown: 'next',
  ArrowUp: 'previous',
  Home: 'first',
  End: 'last',
};
