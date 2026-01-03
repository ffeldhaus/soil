import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TranslocoService } from '@jsverse/transloco';
import { DOCUMENT } from '@angular/common';
import { vi } from 'vitest';

describe('LanguageService', () => {
  let service: LanguageService;
  let translocoService: any;

  beforeEach(() => {
    translocoService = {
      setActiveLang: vi.fn(),
      getActiveLang: vi.fn().mockReturnValue('en')
    };
    
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: translocoService },
        { provide: DOCUMENT, useValue: document }
      ]
    });
    
    localStorage.clear();
  });

  it('should default to English if browser language is not German', () => {
    service = TestBed.inject(LanguageService);
    service.setLanguage('en');
    expect(localStorage.getItem('soil_user_language')).toBe('en');
    expect(translocoService.setActiveLang).toHaveBeenCalledWith('en');
  });

  it('should persist language in localStorage', () => {
    service = TestBed.inject(LanguageService);
    service.setLanguage('de');
    expect(localStorage.getItem('soil_user_language')).toBe('de');
    expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
    expect(document.documentElement.lang).toBe('de');
  });
});