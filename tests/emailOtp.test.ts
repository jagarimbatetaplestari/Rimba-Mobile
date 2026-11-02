import { describe, expect, it } from 'vitest';
import { normalizeEmailOtp, isCompleteEmailOtp } from '../src/lib/auth/emailOtp';

describe('email OTP entry', () => {
  it('preserves all eight digits when typing or pasting an email code', () => {
    expect(normalizeEmailOtp('01234567')).toBe('01234567');
    expect(normalizeEmailOtp('0123 4567')).toBe('01234567');
  });
  it('accepts complete current and legacy codes, rejecting partial codes', () => {
    expect(isCompleteEmailOtp('01234567')).toBe(true);
    expect(isCompleteEmailOtp('012345')).toBe(true);
    for (const code of ['', '12345', '1234567', '123456789', 'abcdefgh']) {
      expect(isCompleteEmailOtp(code)).toBe(false);
    }
  });
});
