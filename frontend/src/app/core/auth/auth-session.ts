import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { CHILD_NAME_FALLBACK } from './auth.constants';
import { AuthStatus, SessionInfo } from './auth.model';

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
   * First name of the child, given by the server with the session; a neutral one until then.
   */
  public readonly childName = signal(CHILD_NAME_FALLBACK);

  /**
   * Whether the visitor may only look, which hides every write; the API refuses a reader's writes anyway.
   */
  public readonly readOnly = signal(false);

  /**
   * Asks the server once whether a session is open; later calls reuse the answer.
   * Only a 401 means signed out: offline or a server error keeps the visitor in the app, where each
   * screen shows its own retry state, and the next 401 still sends them to the login screen.
   */
  public ensureChecked(): Promise<boolean> {
    if (this.status() !== 'unknown') {
      return Promise.resolve(this.signedIn());
    }
    this.pendingCheck ??= firstValueFrom(this.http.get<SessionInfo>(API_ENDPOINTS.session))
      .then(
        (session) => this.open(session),
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
    this.open(await firstValueFrom(this.http.post<SessionInfo>(API_ENDPOINTS.login, { password })));
  }

  /**
   * Closes the session; rejects and stays signed in when the server cannot close it (offline, down),
   * since the session would still open the notebook. A 401 means it was already closed.
   */
  public async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(API_ENDPOINTS.logout, null));
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized)) {
        throw error;
      }
    }
    this.status.set('signed-out');
  }

  /**
   * Records that the server refused the session (a 401 on any call).
   */
  public markSignedOut(): void {
    this.status.set('signed-out');
  }

  /**
   * Records an open session, what it tells about the child and whether it may write.
   */
  private open(session: SessionInfo): void {
    this.childName.set(session.childName);
    this.readOnly.set(session.readOnly);
    this.status.set('signed-in');
  }
}
