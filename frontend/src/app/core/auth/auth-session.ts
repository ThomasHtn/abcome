import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { ServerStatus } from '@core/http/server-status';

import { CHILD_NAME_FALLBACK } from './auth.constants';
import { AuthStatus, SessionInfo } from './auth.model';
import { loginUrlTree } from './auth.utils';

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
   * Sends the visitor to the login screen when a late check finds the session closed.
   */
  private readonly router = inject(Router);

  /**
   * Whether the server answers, so a check it could not answer is made again once it does.
   */
  private readonly serverStatus = inject(ServerStatus);

  /**
   * Whether the session is only assumed open: the check got no answer, so its role is unknown.
   */
  private unverified = false;

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
  public readonly childName = signal(translate(CHILD_NAME_FALLBACK));

  /**
   * Whether the visitor may only look, which hides every write; the API refuses a reader's writes anyway.
   */
  public readonly readOnly = signal(false);

  /**
   * Checks an assumed session again each time the server answers after an outage (network back,
   * any call through).
   */
  constructor() {
    effect(() => {
      if (this.serverStatus.recoveries() > 0 && this.unverified) {
        untracked(() => void this.recheck());
      }
    });
  }

  /**
   * Asks the server once whether a session is open; later calls reuse the answer.
   * Only a 401 means signed out: offline or a server error keeps the visitor in the app, read-only
   * like a reader until the server answers again and a new check tells the role.
   */
  public ensureChecked(): Promise<boolean> {
    if (this.status() !== 'unknown') {
      return Promise.resolve(this.signedIn());
    }
    this.pendingCheck ??= firstValueFrom(this.http.get<SessionInfo>(API_ENDPOINTS.session))
      .then(
        (session) => this.open(session),
        (error: unknown) => {
          if (isUnauthorized(error)) {
            this.status.set('signed-out');
            return;
          }
          this.unverified = true;
          this.readOnly.set(true);
          this.status.set('signed-in');
        },
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
      if (!isUnauthorized(error)) {
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
   * Asks the server again about a session assumed open: learns its role, or leaves for the login
   * screen when it is closed; a check that still gets no answer waits for the next one.
   */
  private async recheck(): Promise<void> {
    this.unverified = false;
    try {
      this.open(await firstValueFrom(this.http.get<SessionInfo>(API_ENDPOINTS.session)));
    } catch (error) {
      if (!isUnauthorized(error)) {
        this.unverified = true;
        return;
      }
      this.markSignedOut();
      void this.router.navigateByUrl(loginUrlTree(this.router, this.router.url));
    }
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

/**
 * Whether a failed call means the server refused the session.
 */
function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;
}
