import { TranslateLoader } from '@ngx-translate/core';
import { join } from 'path';
import { Observable, of } from 'rxjs';
import * as fs from 'fs';

export class TranslateServerLoader implements TranslateLoader {
  constructor(
    // This path assumes your built browser assets are in 'dist/browser/assets/i18n'
    // relative to where your server process starts (process.cwd()).
    // If your project is named 'frontend' and process.cwd() is the project root,
    // the build output is typically in 'dist/browser/'.
    private assetsPath: string = join(process.cwd(), 'dist/browser/assets/i18n')
  ) {
    // console.log('[TranslateServerLoader] Initialized. Reading translations from:', this.assetsPath);
  }

  public getTranslation(lang: string): Observable<unknown> { // Changed Observable<any> to Observable<unknown>
    const filePath = join(this.assetsPath, `${lang}.json`);
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return of(JSON.parse(data));
    } catch { // Removed e
      // console.warn(`[TranslateServerLoader] Could not read translation file: ${filePath}. Error: e`);
      return of({});
    }
  }
}
