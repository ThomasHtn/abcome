import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ENDPOINTS } from './api-endpoints';
import { ServerStatus } from './server-status';
import { serverStatusInterceptor } from './server-status.interceptor';

describe('serverStatusInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let status: ServerStatus;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([serverStatusInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    status = TestBed.inject(ServerStatus);
  });

  afterEach(() => http.verify());

  /**
   * Sends a list request and answers it with `status`.
   */
  function answer(code: number): void {
    client.get(API_ENDPOINTS.words).subscribe({ error: () => undefined });
    http.expectOne(API_ENDPOINTS.words).flush(null, { status: code, statusText: 'Status' });
  }

  it('reports the server down on a 5xx, and up again on the next answer', () => {
    answer(503);
    expect(status.problem()).toBe('server');

    answer(200);
    expect(status.problem()).toBeNull();
    expect(status.recoveries()).toBe(1);
  });

  it('reports the server down when it cannot be reached at all', () => {
    client.get(API_ENDPOINTS.words).subscribe({ error: () => undefined });
    http.expectOne(API_ENDPOINTS.words).error(new ProgressEvent('error'));

    expect(status.problem()).toBe('server');
  });

  it('keeps the server up on a 4xx, an answer about the request itself', () => {
    answer(404);
    expect(status.problem()).toBeNull();
  });

  it('tells a device without network apart, and clears the outage when it comes back', () => {
    answer(503);
    window.dispatchEvent(new Event('offline'));
    expect(status.problem()).toBe('offline');

    window.dispatchEvent(new Event('online'));
    expect(status.problem()).toBeNull();
  });
});
