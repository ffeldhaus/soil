import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { GAME_CONSTANTS } from './game-constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcesPath = path.join(__dirname, '../../sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

function verifyLeafRule(targetVal: any, sourceVal: any, currentPath: string): void {
  if (targetVal === undefined) {
    throw new Error(`${currentPath} is missing in GAME_CONSTANTS`);
  }

  if (sourceVal.exact !== undefined && JSON.stringify(targetVal) !== JSON.stringify(sourceVal.exact)) {
    throw new Error(
      `${currentPath} is ${targetVal}, expected exact ${sourceVal.exact} (Ref: ${sourceVal.uri || 'N/A'})`,
    );
  }

  if (sourceVal.range !== undefined) {
    const [min, max] = sourceVal.range;
    if (targetVal < min || targetVal > max) {
      throw new Error(
        `${currentPath} is ${targetVal}, expected range [${min}, ${max}] (Ref: ${sourceVal.uri || 'N/A'})`,
      );
    }
  }
}

function isLeafRule(sourceVal: any): boolean {
  return Boolean(
    sourceVal && typeof sourceVal === 'object' && (sourceVal.exact !== undefined || sourceVal.range !== undefined),
  );
}

function verifyEntry(obj: any, key: string, sourceVal: any, currentPath: string): void {
  if (key === 'uri' || key === 'description' || key === 'local_uri') return;
  const newPath = currentPath ? `${currentPath}.${key}` : key;

  if (isLeafRule(sourceVal)) {
    verifyLeafRule(obj[key], sourceVal, newPath);
    return;
  }
  if (sourceVal && typeof sourceVal === 'object') {
    if (obj[key] === undefined) {
      throw new Error(`${newPath} is missing in GAME_CONSTANTS`);
    }
    verify(obj[key], sourceVal, newPath);
  }
}

function verify(obj: any, source: any, currentPath = ''): void {
  if (!source || typeof source !== 'object') return;
  for (const key of Object.keys(source)) {
    verifyEntry(obj, key, source[key], currentPath);
  }
}

describe('Game Constants Verification', () => {
  it('should match the values in sources.json', () => {
    verify(GAME_CONSTANTS, sources.GAME_CONSTANTS);
  });
});
