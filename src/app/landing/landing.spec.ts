import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Landing } from './landing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../services/language.service';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = { currentLang: 'en' };
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
