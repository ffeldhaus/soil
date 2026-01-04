import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslocoHttpLoader } from './transloco-loader';
import en from '../../public/i18n/en.json';
import de from '../../public/i18n/de.json';

describe('I18n Coverage Check', () => {
  let service: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['en', 'de'],
            defaultLang: 'de',
          },
          loader: TranslocoHttpLoader
        })
      ]
    });
    service = TestBed.inject(TranslocoService);
    // Manually set translations to avoid HTTP calls in this test
    service.setTranslation(en, 'en');
    service.setTranslation(de, 'de');
  });

  it('should have all keys in German that exist in English', () => {
    const enKeys = getAllKeys(en);
    const deKeys = getAllKeys(de);
    
    const missingInDe = enKeys.filter(k => !deKeys.includes(k));
    expect(missingInDe).withContext('Keys present in en.json but missing in de.json').toEqual([]);
  });

  it('should not have English values in German translation for critical UI keys', () => {
    // List of keys that MUST be translated and not just copied from English
    const criticalKeys = [
        'landing.intro',
        'landing.aboutTitle',
        'landing.backgroundTitle',
        'adminLogin.title',
        'playerLogin.title'
    ];

    criticalKeys.forEach(key => {
        const enValue = service.translate(key, {}, 'en');
        const deValue = service.translate(key, {}, 'de');
        expect(deValue).withContext(`Key "${key}" is still in English in de.json`).not.toEqual(enValue);
    });
  });

  function getAllKeys(obj: any, prefix = ''): string[] {
    return Object.keys(obj).reduce((res: string[], el) => {
      if (Array.isArray(obj[el])) {
        return res;
      } else if (typeof obj[el] === 'object' && obj[el] !== null) {
        return [...res, ...getAllKeys(obj[el], prefix + el + '.')];
      }
      return [...res, prefix + el];
    }, []);
  }
});
