import { Routes } from '@angular/router';

import { authGuard, editorGuard, guestGuard } from '@core/auth/auth.guards';

/**
 * App screens, each lazy so the first visit only loads what it shows.
 * Route and query parameters reach page inputs directly (`withComponentInputBinding`):
 * `id` on the word page, `tab`, `q` and `filter` on home, `word` on the add-word and record screens.
 * Those two write-only screens are closed to a reader. Titles are translation keys, translated by
 * `BrandedTitleStrategy` and followed by the app name; home has none, so its tab shows the app name alone.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'routes.login',
    canActivate: [guestGuard],
    loadComponent: () => import('@pages/login/login').then((page) => page.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@pages/home/home').then((page) => page.HomePage),
      },
      {
        path: 'words/new',
        title: 'routes.wordNew',
        canActivate: [editorGuard],
        loadComponent: () => import('@pages/word-new/word-new').then((page) => page.WordNewPage),
      },
      {
        path: 'words/:id',
        title: 'routes.word',
        data: { kind: 'word' },
        loadComponent: () =>
          import('@pages/word-detail/word-detail').then((page) => page.WordDetailPage),
      },
      {
        path: 'sentences/:id',
        title: 'routes.sentence',
        data: { kind: 'sentence' },
        loadComponent: () =>
          import('@pages/word-detail/word-detail').then((page) => page.WordDetailPage),
      },
      {
        path: 'recordings/new',
        title: 'routes.recordingNew',
        canActivate: [editorGuard],
        loadComponent: () =>
          import('@pages/recording-new/recording-new').then((page) => page.RecordingNewPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
