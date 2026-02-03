import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { GAME_CONSTANTS } from './game-constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcesPath = path.join(__dirname, '../../sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

function verify(obj: any, source: any, currentPath: string = ''): void {
  if (!source || typeof source !== 'object') return;

  for (const key in source) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const sourceVal = source[key];

    // Skip URI documentation keys
    if (key === 'uri' || key === 'description') continue;

    // Check if we have an exact value or range definition
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      (sourceVal.exact !== undefined || sourceVal.range !== undefined)
    ) {
      const targetVal = obj[key];

      if (targetVal === undefined) {
        throw new Error(`${newPath} is missing in GAME_CONSTANTS`);
      }

      if (sourceVal.exact !== undefined) {
        if (JSON.stringify(targetVal) !== JSON.stringify(sourceVal.exact)) {
          throw new Error(
            `${newPath} is ${targetVal}, expected exact ${sourceVal.exact} (Ref: ${sourceVal.uri || 'N/A'})`,
          );
        }
      }

      if (sourceVal.range !== undefined) {
        const [min, max] = sourceVal.range;
        if (targetVal < min || targetVal > max) {
          throw new Error(
            `${newPath} is ${targetVal}, expected range [${min}, ${max}] (Ref: ${sourceVal.uri || 'N/A'})`,
          );
        }
      }
    } else if (typeof sourceVal === 'object') {
      // Recurse
      if (obj[key] === undefined) {
        throw new Error(`${newPath} is missing in GAME_CONSTANTS`);
      }
      verify(obj[key], sourceVal, newPath);
    }
  }
}

describe('Game Constants Verification', () => {
  it('should match the values in sources.json', () => {
    verify(GAME_CONSTANTS, sources.GAME_CONSTANTS);
  });
});
