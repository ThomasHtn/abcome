import { Routes } from '@angular/router';

import { authGuard, editorGuard, guestGuard } from '@core/auth/auth.guards';

/**
 * App screens, each lazy so the first visit only loads what it shows.
 * Route and query parameters reach page inputs directly (`withComponentInputBinding`):
 * `id` on the word page, `tab`, `q` and `filter` on home, `word` on the add-word and record screens.
 * Those two write-only screens are closed to a reader.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion · ABCome',
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
        title: 'ABCome',
        loadComponent: () => import('@pages/home/home').then((page) => page.HomePage),
      },
      {
        path: 'words/new',
        title: 'Nouveau mot · ABCome',
        canActivate: [editorGuard],
        loadComponent: () => import('@pages/word-new/word-new').then((page) => page.WordNewPage),
      },
      {
        path: 'words/:id',
        title: 'Mot · ABCome',
        data: { kind: 'word' },
        loadComponent: () =>
          import('@pages/word-detail/word-detail').then((page) => page.WordDetailPage),
      },
      {
        path: 'sentences/:id',
        title: 'Phrase · ABCome',
        data: { kind: 'sentence' },
        loadComponent: () =>
          import('@pages/word-detail/word-detail').then((page) => page.WordDetailPage),
      },
      {
        path: 'recordings/new',
        title: 'Enregistrer un son · ABCome',
        canActivate: [editorGuard],
        loadComponent: () =>
          import('@pages/recording-new/recording-new').then((page) => page.RecordingNewPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
