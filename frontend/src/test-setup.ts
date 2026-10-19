import { TestBed } from '@angular/core/testing';

import { TranslocoService } from '@jsverse/transloco';

// Creates the French service that `translate()` uses in pure functions tested without TestBed, then
// frees TestBed for each spec's own configuration.
beforeAll(() => {
  TestBed.inject(TranslocoService);
  TestBed.resetTestingModule();
});
