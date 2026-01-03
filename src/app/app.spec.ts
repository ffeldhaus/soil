import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { LanguageService } from './services/language.service';
import { SwUpdate } from '@angular/service-worker';
import { EMPTY, of } from 'rxjs';
import { provideTranslocoTest } from './transloco-testing.module';

describe('App', () => {
  let languageServiceMock: any;
  let swUpdateMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      init: vi.fn(),
      getLanguage: vi.fn().mockReturnValue('en-US')
    };
    
    swUpdateMock = {
      versionUpdates: EMPTY,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideTranslocoTest(),
        provideRouter([]),
        { 
            provide: ActivatedRoute, 
            useValue: {
                snapshot: { paramMap: { get: () => null } },
                params: of({}),
                queryParams: of({})
            }
        },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: SwUpdate, useValue: swUpdateMock }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
