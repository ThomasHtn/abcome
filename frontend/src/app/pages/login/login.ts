import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { returnUrlFrom } from '@core/auth/auth.utils';
import { AuthSession } from '@core/auth/auth-session';
import { Button } from '@shared/button/button';
import { Icon } from '@shared/icon/icon';
import { Mascot } from '@shared/mascot/mascot';

import { LOGIN_MESSAGES, LOGIN_SUCCESS_DELAY_MS } from './login.constants';
import { loginErrorMessage, loginMascotState } from './login.utils';

/**
 * Login screen: the family password, with Lapinou covering his eyes while it is typed.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, Mascot],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  /**
   * Opens the server session.
   */
  private readonly session = inject(AuthSession);

  /**
   * Leaves for the home screen once Lapinou has jumped.
   */
  private readonly router = inject(Router);

  /**
   * Pending navigation after a success, cleared if the screen goes away first.
   */
  private successTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * `?retour=` from the URL: the page the session expired on, reopened after signing in.
   */
  public readonly retour = input<string>();

  /**
   * Password as typed.
   */
  protected readonly password = signal('');

  /**
   * Whether the password is shown in clear.
   */
  protected readonly passwordVisible = signal(false);

  /**
   * Whether the field has the focus, which decides if Lapinou hides his eyes.
   */
  protected readonly focused = signal(false);

  /**
   * A login request is on its way.
   */
  protected readonly submitting = signal(false);

  /**
   * The password was accepted; the screen only waits for the jump to end.
   */
  protected readonly succeeded = signal(false);

  /**
   * Why the last attempt failed, `null` when there is nothing to say.
   */
  protected readonly error = signal<string | null>(null);

  /**
   * Plays the shake once after a refusal; reset when the animation ends so the next one replays.
   */
  protected readonly shaking = signal(false);

  /**
   * Lapinou's pose for the current state of the form.
   */
  protected readonly mascotState = computed(() =>
    loginMascotState({
      succeeded: this.succeeded(),
      focused: this.focused(),
      visible: this.passwordVisible(),
      hasPassword: this.password().length > 0,
    }),
  );

  /**
   * Line under the field: the error, the success, or who to ask for the password.
   */
  protected readonly helpText = computed(
    () => this.error() ?? (this.succeeded() ? LOGIN_MESSAGES.success : LOGIN_MESSAGES.hint),
  );

  /**
   * The button only works with a password and while nothing is pending.
   */
  protected readonly canSubmit = computed(
    () => this.password().length > 0 && !this.submitting() && !this.succeeded(),
  );

  /**
   * Cancels a pending navigation when the screen is left early.
   */
  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.successTimer));
  }

  /**
   * Keeps the typed password and clears a stale error.
   */
  protected onInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
    this.error.set(null);
  }

  /**
   * Shows or hides the password.
   */
  protected toggleVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  /**
   * Sends the password; on success Lapinou jumps, then the notebook opens.
   */
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.session.signIn(this.password());
      this.succeeded.set(true);
      const destination = returnUrlFrom(this.retour());
      this.successTimer = setTimeout(
        () => void this.router.navigateByUrl(destination),
        LOGIN_SUCCESS_DELAY_MS,
      );
    } catch (error: unknown) {
      this.error.set(loginErrorMessage(error));
      this.shaking.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
