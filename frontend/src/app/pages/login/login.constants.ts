/**
 * Messages under the password field, in the family's words.
 */
export const LOGIN_MESSAGES = {
  /**
   * Wrong password: the server never says more, so neither do we.
   */
  invalid: "Ce n'est pas le bon mot de passe, réessaie.",

  /**
   * Locked out without a usable `Retry-After`; the lockout is per address, so the whole home shares it.
   */
  tooManyAttempts:
    "Trop d'essais\u00A0: le carnet est bloqué sur ce réseau, pour toute la maison. Réessaie dans quelques minutes.",

  /**
   * Too many sign-ins checked at the same moment: a matter of seconds, not a lockout.
   */
  busy: 'Trop de connexions en même temps, réessaie dans quelques secondes.',

  /**
   * Network failure or unexpected answer.
   */
  unreachable: 'Impossible de joindre le carnet. Vérifie la connexion et réessaie.',

  /**
   * Shown before anything is tried: who holds the shared password.
   */
  hint: "C'est le mot de passe de la famille\u00A0: demande-le aux parents de Côme.",

  /**
   * Shown while Lapinou jumps, just before the home screen.
   */
  success: "C'est le bon mot de passe !",
} as const;

/**
 * Below this `Retry-After`, the refusal is a short burst limit rather than the 15-minute lockout.
 */
export const SHORT_RETRY_SECONDS = 60;

/**
 * Time left for Lapinou's jump before the home screen replaces the login screen.
 */
export const LOGIN_SUCCESS_DELAY_MS = 800;
