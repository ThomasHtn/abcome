import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { API_ENDPOINTS } from '@core/http/api-endpoints';

import { AuthSession } from './auth-session';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: AuthSession;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/mots/nouveau');
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    session.status.set('signed-in');
  });

  afterEach(() => http.verify());

  it('signs out and goes to the login screen on a 401 from a data call', () => {
    client.get(API_ENDPOINTS.words).subscribe({ error: () => undefined });

    http.expectOne(API_ENDPOINTS.words).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(session.status()).toBe('signed-out');
    const target = navigateByUrl.mock.calls[0]?.[0] as UrlTree;
    expect(String(target)).toBe('/connexion?retour=%2Fmots%2Fnouveau');
  });

  it('leaves a wrong password to the login screen', () => {
    client.post(API_ENDPOINTS.login, {}).subscribe({ error: () => undefined });

    http.expectOne(API_ENDPOINTS.login).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(session.status()).toBe('signed-in');
  });

  it('lets other errors through untouched', () => {
    client.get(API_ENDPOINTS.words).subscribe({ error: () => undefined });

    http.expectOne(API_ENDPOINTS.words).flush(null, { status: 500, statusText: 'Server Error' });

    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
