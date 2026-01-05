import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { provideTranslocoTest } from '../transloco-testing.module';
import { ImpressumComponent } from './impressum';

describe('ImpressumComponent', () => {
  let component: ImpressumComponent;
  let fixture: ComponentFixture<ImpressumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImpressumComponent, RouterTestingModule],
      providers: [provideTranslocoTest()],
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
    expect(compiled.textContent).toContain('Nina Wolf');
  });
});
