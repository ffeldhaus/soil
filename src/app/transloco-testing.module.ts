import { TranslocoService, TranslocoPipe, TRANSLOCO_CONFIG } from '@jsverse/transloco';
import { of } from 'rxjs';

export function provideTranslocoTest() {
  const serviceMock = {
    translate: (key: string, params?: any) => {
        // Handle specific test assertions for crops
        if (key === 'adminLogin.error.msg') return 'Login failed';
        if (key === 'crop.animals') return 'Animals';
        if (key === 'crop.wheat') return 'Wheat';
        if (key === 'crop.corn') return 'Corn';
        if (key === 'crop.potato') return 'Potato';
        if (key === 'crop.beet') return 'Beet';
        if (key === 'crop.barley') return 'Barley';
        if (key === 'crop.oat') return 'Oat';
        if (key === 'crop.rye') return 'Rye';
        if (key === 'crop.fieldbean') return 'Fieldbean';
        if (key === 'crop.fallow') return 'Fallow';

        if (params) {
            let s = key;
            Object.keys(params).forEach(p => {
                s += `:${p}=${params[p]}`;
            });
            return s;
        }
        return key;
    },
    selectTranslate: (key: string) => of(key),
    getActiveLang: () => 'de',
    setActiveLang: (lang: string) => {},
    langChanges$: of('de'),
    config: {
        reRenderOnLangChange: true,
        defaultLang: 'de',
        availableLangs: ['en', 'de']
    },
    // Internal methods needed by TranslocoPipe
    _loadDependencies: () => of(true),
    _handleReadyAndScope: () => of(true)
  };

  return [
    {
      provide: TRANSLOCO_CONFIG,
      useValue: {
        availableLangs: ['en', 'de'],
        defaultLang: 'de',
        reRenderOnLangChange: true
      }
    },
    {
      provide: TranslocoService,
      useValue: serviceMock
    },
    TranslocoPipe
  ];
}
