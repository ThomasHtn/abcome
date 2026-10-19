/**
 * Login screen, where any 401 sends the visitor back.
 */
export const LOGIN_ROUTE = '/connexion';

/**
 * Home screen, where a signed-in visitor lands.
 */
export const HOME_ROUTE = '/';

/**
 * Query parameter of the login screen holding the page to go back to after signing in.
 */
export const RETURN_URL_PARAM = 'retour';

/**
 * Name shown until the server has given the child's one, when the app starts offline.
 */
export const CHILD_NAME_FALLBACK = 'Bébé';
