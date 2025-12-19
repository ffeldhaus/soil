/**
 * Generates a random alphanumeric password of the specified length.
 * Excludes ambiguous characters (I, 1, O, 0).
 */
export function generateRandomPassword(length: number = 6): string {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}
