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
    expect(String(loginUrlTree(router(), '/mots/nouveau?mot=lap'))).toBe(
      '/connexion?retour=%2Fmots%2Fnouveau%3Fmot%3Dlap',
    );
  });

  it('does not bother remembering home or the login screen', () => {
    const tree = router();
    expect(String(loginUrlTree(tree, '/'))).toBe('/connexion');
    expect(String(loginUrlTree(tree, '/connexion?retour=%2F'))).toBe('/connexion');
  });
});

describe('returnUrlFrom', () => {
  it('keeps an in-app path', () => {
    expect(returnUrlFrom('/mots/3')).toBe('/mots/3');
    expect(returnUrlFrom('/?onglet=phrases')).toBe('/?onglet=phrases');
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
      '/connexion',
    ]) {
      expect(returnUrlFrom(value)).toBe('/');
    }
  });
});
