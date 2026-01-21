import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { App } from './app';
import { LanguageService } from './services/language.service';

describe('App', () => {
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      init: vi.fn(),
      getLanguage: vi.fn().mockReturnValue('en-US'),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
            params: of({}),
            queryParams: of({}),
          },
        },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
