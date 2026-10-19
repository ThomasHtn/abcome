import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { loginUrlTree, returnUrlFrom } from './auth.utils';

describe('loginUrlTree', () => {
  /**
   * The router of a bare test injector.
   */
  function router(): Router {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    return TestBed.inject(Router);
  }

  it('remembers the page the visitor was on', () => {
    expect(String(loginUrlTree(router(), '/words/new?word=lap'))).toBe(
      '/login?returnUrl=%2Fwords%2Fnew%3Fword%3Dlap',
    );
  });

  it('does not bother remembering home or the login screen', () => {
    const tree = router();
    expect(String(loginUrlTree(tree, '/'))).toBe('/login');
    expect(String(loginUrlTree(tree, '/login?returnUrl=%2F'))).toBe('/login');
  });
});

describe('returnUrlFrom', () => {
  it('keeps an in-app path', () => {
    expect(returnUrlFrom('/words/3')).toBe('/words/3');
    expect(returnUrlFrom('/?tab=sentences')).toBe('/?tab=sentences');
  });

  it('falls back to home for anything else', () => {
    for (const value of [
      null,
      undefined,
      '',
      'mots/3',
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      '/login',
    ]) {
      expect(returnUrlFrom(value)).toBe('/');
    }
  });
});
