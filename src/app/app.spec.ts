import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { LanguageService } from './services/language.service';

describe('App', () => {
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: 'en'
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
