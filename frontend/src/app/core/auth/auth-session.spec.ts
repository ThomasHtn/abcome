import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

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

  it('asks the server once, even when two guards check together', async () => {
    const first = session.ensureChecked();
    const second = session.ensureChecked();

    http.expectOne(API_ENDPOINTS.session).flush(null, { status: 204, statusText: 'No Content' });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(await session.ensureChecked()).toBe(true);
    expect(session.signedIn()).toBe(true);
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
  });

  it('keeps the visitor in the app on a server error during the check', async () => {
    const check = session.ensureChecked();
    http
      .expectOne(API_ENDPOINTS.session)
      .flush(null, { status: 504, statusText: 'Gateway Timeout' });
    expect(await check).toBe(true);
  });

  it('opens the session only when the password is accepted', async () => {
    const accepted = session.signIn('une phrase de passe');
    const request = http.expectOne(API_ENDPOINTS.login);
    expect(request.request.body).toEqual({ password: 'une phrase de passe' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await accepted;
    expect(session.signedIn()).toBe(true);
  });

  it('rejects with the HTTP error on a wrong password and stays signed out', async () => {
    const refused = session.signIn('faux');
    http
      .expectOne(API_ENDPOINTS.login)
      .flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });

    await expect(refused).rejects.toMatchObject({ status: 401 });
    expect(session.signedIn()).toBe(false);
  });

  it('clears the local state at logout even when the server is unreachable', async () => {
    session.status.set('signed-in');

    const signOut = session.signOut();
    http.expectOne(API_ENDPOINTS.logout).error(new ProgressEvent('error'));

    await expect(signOut).rejects.toBeTruthy();
    expect(session.status()).toBe('signed-out');
  });
});
