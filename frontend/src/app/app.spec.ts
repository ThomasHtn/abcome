import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });
  });

  it('hosts the screen column and the shared feedback', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('main router-outlet')).not.toBeNull();
    expect(element.querySelector('app-toast-outlet [role="status"]')).not.toBeNull();
    expect(element.querySelector('app-celebration-burst')).not.toBeNull();
  });
});
