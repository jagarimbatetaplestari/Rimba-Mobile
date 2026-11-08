import { describe, expect, it } from 'vitest';
import {
  EMAIL_OTP_STANDARD_LENGTH,
  EMAIL_OTP_MIN_LENGTH,
  EMAIL_OTP_MAX_LENGTH,
  normalizeEmailOtp,
  isCompleteEmailOtp,
  isValidEmailOtp,
} from '../src/lib/auth/emailOtp';

describe('email OTP entry', () => {
  it('defines 6 digits as standard with 6 to 8 digit compatibility', () => {
    expect(EMAIL_OTP_STANDARD_LENGTH).toBe(6);
    expect(EMAIL_OTP_MIN_LENGTH).toBe(6);
    expect(EMAIL_OTP_MAX_LENGTH).toBe(8);
  });

  it('preserves all digits up to max length when typing or pasting', () => {
    expect(normalizeEmailOtp('123456')).toBe('123456');
    expect(normalizeEmailOtp('123 456')).toBe('123456');
    expect(normalizeEmailOtp('01234567')).toBe('01234567');
    expect(normalizeEmailOtp('0123 4567')).toBe('01234567');
    expect(normalizeEmailOtp('1234567890')).toBe('12345678');
  });

  it('accepts standard 6-digit and legacy 8-digit codes, rejecting incomplete or invalid ones', () => {
    expect(isCompleteEmailOtp('123456')).toBe(true);
    expect(isCompleteEmailOtp('01234567')).toBe(true);
    expect(isValidEmailOtp('123456')).toBe(true);
    expect(isValidEmailOtp('01234567')).toBe(true);

    for (const code of ['', '12345', '1234567', '123456789', 'abcdef', '12a456']) {
      expect(isCompleteEmailOtp(code)).toBe(false);
      expect(isValidEmailOtp(code)).toBe(false);
    }
  });
});
