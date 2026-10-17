/**
 * What the login screen knows when it picks Lapinou's pose.
 */
export interface LoginMascotContext {
  /**
   * The password was accepted.
   */
  succeeded: boolean;

  /**
   * The password field has the focus.
   */
  focused: boolean;

  /**
   * The password is shown in clear.
   */
  visible: boolean;

  /**
   * At least one character was typed.
   */
  hasPassword: boolean;
}
