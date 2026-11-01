// A failed secure context must never downgrade native authentication to Math.random.
export async function generateCryptographicNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const secureCrypto = globalThis.crypto;
  if (!secureCrypto?.getRandomValues || !secureCrypto.subtle?.digest) {
    throw new Error('Secure authentication is unavailable. Please restart the app.');
  }
  const bytes = secureCrypto.getRandomValues(new Uint8Array(32));
  const rawNonce = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const hash = await secureCrypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
  const hashedNonce = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  return { rawNonce, hashedNonce };
}
