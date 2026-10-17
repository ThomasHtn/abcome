import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the title and a labelled back link', () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('heading', 'Nouveau mot');
    fixture.componentRef.setInput('backLink', '/');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe('Nouveau mot');
    const back = element.querySelector('a');
    expect(back?.getAttribute('href')).toBe('/');
    expect(back?.getAttribute('aria-label')).toBe("Retour à l'accueil");
  });

  it('has no back link without a target', () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('heading', 'Les mots de Côme');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('a')).toBeNull();
  });
});
