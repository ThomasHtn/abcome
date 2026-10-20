import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { translate } from '@jsverse/transloco';

import { API_ENDPOINTS } from '@core/http/api-endpoints';
import { ServerStatus } from '@core/http/server-status';

import { CHILD_NAME_FALLBACK } from './auth.constants';
import { AuthSession } from './auth-session';

describe('AuthSession', () => {
  let session: AuthSession;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the server once, even when two guards check together, and learns the child name', async () => {
    const first = session.ensureChecked();
    const second = session.ensureChecked();

    http.expectOne(API_ENDPOINTS.session).flush({ childName: 'Alix', readOnly: false });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(await session.ensureChecked()).toBe(true);
    expect(session.signedIn()).toBe(true);
    expect(session.childName()).toBe('Alix');
  });

  it('counts a 401 on the check as signed out', async () => {
    const check = session.ensureChecked();

    http
      .expectOne(API_ENDPOINTS.session)
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });

    expect(await check).toBe(false);
    expect(session.status()).toBe('signed-out');
  });

  it('keeps the visitor in the app when the check cannot reach the server', async () => {
    const offline = session.ensureChecked();
    http.expectOne(API_ENDPOINTS.session).error(new ProgressEvent('error'));
    expect(await offline).toBe(true);
    expect(session.status()).toBe('signed-in');
    expect(session.childName()).toBe(translate(CHILD_NAME_FALLBACK));
    expect(session.readOnly()).toBe(true);
  });

  /**
   * Fails the first check for lack of server, then has the server answer again after an outage.
   */
  async function checkWhileServerAway(): Promise<void> {
    const check = session.ensureChecked();
    http.expectOne(API_ENDPOINTS.session).error(new ProgressEvent('error'));
    await check;
    const status = TestBed.inject(ServerStatus);
    status.report(true);
    status.report(false);
    TestBed.tick();
  }

  it('checks again once the server answers, and learns the role and the child name', async () => {
    await checkWhileServerAway();

    http.expectOne(API_ENDPOINTS.session).flush({ childName: 'Alix', readOnly: false });
    await Promise.resolve();

    expect(session.readOnly()).toBe(false);
    expect(session.childName()).toBe('Alix');
  });

  it('leaves for the login screen when the late check finds the session closed', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await checkWhileServerAway();

    http
      .expectOne(API_ENDPOINTS.session)
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();

    expect(session.status()).toBe('signed-out');
    expect(navigate).toHaveBeenCalled();
  });

  it('keeps the visitor in the app on a server error during the check', async () => {
    const check = session.ensureChecked();
    http
      .expectOne(API_ENDPOINTS.session)
      .flush(null, { status: 504, statusText: 'Gateway Timeout' });
    expect(await check).toBe(true);
  });

  it('learns from the server whether the session may only read', async () => {
    const accepted = session.signIn('une phrase de lecteur');
    http.expectOne(API_ENDPOINTS.login).flush({ childName: 'Alix', readOnly: true });
    await accepted;

    expect(session.signedIn()).toBe(true);
    expect(session.readOnly()).toBe(true);
  });

  it('opens the session and learns the child name only when the password is accepted', async () => {
    const accepted = session.signIn('une phrase de passe');
    const request = http.expectOne(API_ENDPOINTS.login);
    expect(request.request.body).toEqual({ password: 'une phrase de passe' });
    request.flush({ childName: 'Alix', childBirthDate: '2025-05-12', readOnly: false });
    await accepted;
    expect(session.signedIn()).toBe(true);
    expect(session.childName()).toBe('Alix');
    expect(session.childBirthDate()).toBe('2025-05-12');
  });

  it('rejects with the HTTP error on a wrong password and stays signed out', async () => {
    const refused = session.signIn('faux');
    http
      .expectOne(API_ENDPOINTS.login)
      .flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });

    await expect(refused).rejects.toMatchObject({ status: 401 });
    expect(session.signedIn()).toBe(false);
  });

  it('stays signed in when the server cannot close the session, which would still be open', async () => {
    session.status.set('signed-in');

    const signOut = session.signOut();
    http.expectOne(API_ENDPOINTS.logout).error(new ProgressEvent('error'));

    await expect(signOut).rejects.toBeTruthy();
    expect(session.status()).toBe('signed-in');
  });

  it('counts a session the server no longer knows as closed', async () => {
    session.status.set('signed-in');

    const signOut = session.signOut();
    http.expectOne(API_ENDPOINTS.logout).flush(null, { status: 401, statusText: 'Unauthorized' });

    await signOut;
    expect(session.status()).toBe('signed-out');
  });
});
