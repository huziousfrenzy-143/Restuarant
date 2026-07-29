import crypto from 'crypto';

const SALT = process.env.PASSWORD_SALT || 'saas-restaurant-salt-2026';

/**
 * Hashes a plain-text password using PBKDF2 with SHA-512.
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}

/**
 * Verifies a plain-text input password against a stored hashed or plain-text password.
 */
export function verifyPassword(inputPassword?: string, storedHashOrPlain?: string): boolean {
  if (!inputPassword || !storedHashOrPlain) return false;

  // 1. Check PBKDF2 hash match
  const hashedInput = hashPassword(inputPassword);
  if (hashedInput === storedHashOrPlain) {
    return true;
  }

  // 2. Direct comparison fallback for pre-existing plain text seed entries
  return inputPassword === storedHashOrPlain;
}
