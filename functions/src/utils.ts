import { randomInt } from 'node:crypto';

/**
 * Generates a cryptographically secure random alphanumeric password of the specified length.
 * Excludes ambiguous characters (I, 1, O, 0).
 */
export function generateRandomPassword(length = 6): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
}

/**
 * Escapes HTML special characters to prevent HTML/XSS injection in emails.
 */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
