export const EMAIL_OTP_MAX_LENGTH = 8;

export function normalizeEmailOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, EMAIL_OTP_MAX_LENGTH);
}

export function isCompleteEmailOtp(value: string): boolean {
  return /^(?:\d{6}|\d{8})$/.test(value);
}
