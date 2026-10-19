/**
 * Family passphrase of the stack under test: the demo one of backend/.env.example unless overridden.
 */
export const PASSPHRASE = process.env['E2E_PASSPHRASE'] ?? 'littlewords-demo-passphrase';

/**
 * Session cookie saved by the setup project and reused by every test (gitignored).
 */
export const SESSION_FILE = 'e2e/.auth/family.json';
