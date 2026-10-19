import { TestBed } from '@angular/core/testing';

import { TranslocoService } from '@jsverse/transloco';

// jsdom has no modal dialogs: stand in with the `open` attribute and the close event, as a browser does.
// Set once here: spec files share one global scope (isolate is off), so a per-file stub would leak.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

// Creates the French service that `translate()` uses in pure functions tested without TestBed, then
// frees TestBed for each spec's own configuration.
beforeAll(() => {
  TestBed.inject(TranslocoService);
  TestBed.resetTestingModule();
});
