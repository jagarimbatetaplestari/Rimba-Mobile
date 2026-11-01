import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto, createHash } from 'node:crypto';
import { generateCryptographicNoncePair } from '../src/lib/auth/nonce';
afterEach(() => vi.unstubAllGlobals());
it('uses random nonces and passes a SHA-256 digest to Apple', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const first = await generateCryptographicNoncePair(); const second = await generateCryptographicNoncePair();
  expect(first.rawNonce).not.toBe(second.rawNonce);
  expect(first.hashedNonce).toBe(createHash('sha256').update(first.rawNonce).digest('hex'));
  expect(first.rawNonce).toMatch(/^[a-f0-9]{64}$/);
});
it('refuses Apple authorization when secure randomness is unavailable', async () => {
  vi.stubGlobal('crypto', undefined);
  await expect(generateCryptographicNoncePair()).rejects.toThrow('Secure authentication is unavailable');
});
it('refuses authorization when SHA-256 is unavailable', async () => {
  vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  await expect(generateCryptographicNoncePair()).rejects.toThrow('Secure authentication is unavailable');
});
