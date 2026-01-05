import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LanguageService, { provide: DOCUMENT, useValue: document }],
    });

    localStorage.clear();
  });

  it('should return current language from LOCALE_ID', () => {
    service = TestBed.inject(LanguageService);
    // In test environment LOCALE_ID is usually 'en-US' by default
    expect(service.currentLang).toBe('en');
  });

  it('should persist language in localStorage', () => {
    service = TestBed.inject(LanguageService);
    // Mock location.pathname to avoid actual redirect in test
    const originalPathname = document.location.pathname;

    service.setLanguage('de');
    expect(localStorage.getItem('soil_user_language')).toBe('de');

    // Cleanup
    if (document.location.pathname !== originalPathname) {
      // Restore if it changed, though in jsdom it might actually change
    }
  });
});
