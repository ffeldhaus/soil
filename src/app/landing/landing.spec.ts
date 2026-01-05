import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageService } from '../services/language.service';
import { provideTranslocoTest } from '../transloco-testing.module';
import { Landing } from './landing';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = { currentLang: 'de' };
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideTranslocoTest(),
        provideRouter([]),
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
