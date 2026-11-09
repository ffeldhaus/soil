import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const KEYSTORE_PATH = resolve(process.cwd(), 'android/signing.keystore');
const KEYCHAIN_ACCOUNT = 'soil';
const KEYCHAIN_SERVICE_B64 = 'app.soil.twa.keystore-base64';

if (!existsSync(KEYSTORE_PATH)) {
  try {
    const b64 = execFileSync(
      'security',
      ['find-generic-password', '-a', KEYCHAIN_ACCOUNT, '-s', KEYCHAIN_SERVICE_B64, '-w'],
      { encoding: 'utf8' },
    ).trim();
    if (b64) {
      mkdirSync(dirname(KEYSTORE_PATH), { recursive: true });
      writeFileSync(KEYSTORE_PATH, Buffer.from(b64, 'base64'));
      process.stdout.write('Restored android/signing.keystore from macOS Keychain.\n');
    }
  } catch {
    console.warn('Warning: android/signing.keystore not found and could not be restored from macOS Keychain.');
  }
}
