import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { ImpressumComponent } from './impressum';

describe('ImpressumComponent', () => {
  let component: ImpressumComponent;
  let fixture: ComponentFixture<ImpressumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImpressumComponent],
      providers: [provideRouter([]), provideClientHydration(withIncrementalHydration())],
    }).compileComponents();

    fixture = TestBed.createComponent(ImpressumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display contact information', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Florian Feldhaus');
  });

  it('should display OER license and TULLU attribution', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('OER-Lizenz & Urheberrecht (TULLU)');
    expect(compiled.textContent).toContain('Creative Commons Namensnennung 4.0 International (CC BY 4.0)');
    expect(compiled.textContent).toContain('Apache License 2.0');
    expect(compiled.textContent).toContain('Dr. Nina Wolf & Florian Feldhaus');
  });
});
