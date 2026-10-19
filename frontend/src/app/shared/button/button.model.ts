/**
 * Look of a button, from the app's design system.
 * `primary` salmon main action, `secondary` lavender save, `outline` cancel, `dark` log out,
 * `danger` confirmed deletion, `soft` lavender tinted link ("Ajouter « x »"), `link` underlined text.
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'dark' | 'danger' | 'soft' | 'link';

/**
 * Height of a button: `lg` 60 px bottom-bar action, `md` 56 px sheet action, `sm` 44 px inline action.
 */
export type ButtonSize = 'lg' | 'md' | 'sm';
