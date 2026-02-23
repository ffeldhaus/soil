import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundComponent } from './not-found';

describe('NotFoundComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display 404 and "Seite nicht gefunden"', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('404');
    expect(compiled.querySelector('h2')?.textContent).toContain('Seite nicht gefunden');
  });

  it('should not display the redundant "SOIL" header at the bottom', () => {
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // The main SOIL logo/string that was removed was a h1 in a div with pt-8
    // Now there are only 2 headers: h1 (404) and h2 (Seite nicht gefunden)
    const headers = compiled.querySelectorAll('h1');
    headers.forEach(h => {
      expect(h.textContent).not.toBe('SOIL');
    });
  });
});
