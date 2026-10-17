import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { AuthStatus } from './auth.model';

/**
 * Family session state; the server holds the session, this only mirrors whether one is open.
 */
@Service()
export class AuthSession {
  /**
   * Sends the session, login and logout calls.
   */
  private readonly http = inject(HttpClient);

  /**
   * Running session check, shared by guards that fire together.
   */
  private pendingCheck: Promise<boolean> | null = null;

  /**
   * Whether a session is open; `unknown` until the first check.
   */
  public readonly status = signal<AuthStatus>('unknown');

  /**
   * Gates every data resource, so nothing is fetched before login and lists clear at logout.
   */
  public readonly signedIn = computed(() => this.status() === 'signed-in');

  /**
   * Asks the server once whether a session is open; later calls reuse the answer.
   * Only a 401 means signed out: offline or a server error keeps the visitor in the app, where each
   * screen shows its own retry state, and the next 401 still sends them to the login screen.
   */
  public ensureChecked(): Promise<boolean> {
    if (this.status() !== 'unknown') {
      return Promise.resolve(this.signedIn());
    }
    this.pendingCheck ??= firstValueFrom(this.http.get(API_ENDPOINTS.session))
      .then(
        () => this.status.set('signed-in'),
        (error: unknown) =>
          this.status.set(
            error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized
              ? 'signed-out'
              : 'signed-in',
          ),
      )
      .then(() => {
        this.pendingCheck = null;
        return this.signedIn();
      });
    return this.pendingCheck;
  }

  /**
   * Opens a session; rejects with the HTTP error so the login screen can read its code.
   */
  public async signIn(password: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(API_ENDPOINTS.login, { password }));
    this.status.set('signed-in');
  }

  /**
   * Closes the session; the local state is cleared even when the server cannot be reached.
   */
  public async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(API_ENDPOINTS.logout, null));
    } finally {
      this.status.set('signed-out');
    }
  }

  /**
   * Records that the server refused the session (a 401 on any call).
   */
  public markSignedOut(): void {
    this.status.set('signed-out');
  }
}
