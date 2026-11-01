import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/deploy-appstore.yml', 'utf8');
const runPreflight = (extra: Record<string, string>) => spawnSync(process.execPath,
  ['scripts/check-release-env.mjs'], { encoding: 'utf8', env: { ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    NEXT_PUBLIC_REVENUECAT_IOS_KEY: '', APPLE_CERTIFICATE_BASE64: '',
    APPLE_CERTIFICATE_PASSWORD: '', APPLE_PROVISION_PROFILE_BASE64: '',
    APP_STORE_CONNECT_PRIVATE_KEY_BASE64: '', ...extra } });
const configured = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://rkljugrrscmqopeuwtpd.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon',
  NEXT_PUBLIC_REVENUECAT_IOS_KEY: 'appl_synthetic',
  APPLE_CERTIFICATE_BASE64: 'synthetic-cert', APPLE_CERTIFICATE_PASSWORD: 'synthetic-password',
  APPLE_PROVISION_PROFILE_BASE64: 'synthetic-profile',
  APP_STORE_CONNECT_PRIVATE_KEY_BASE64: 'synthetic-private-key',
};
describe('release configuration gates', () => {
  it('does not embed a certificate password fallback in the public workflow', () => {
    const binding = workflow.match(/^\s*CERTIFICATE_PASSWORD:\s*(.+)$/m)?.[1];
    expect(binding === '${{ secrets.APPLE_CERTIFICATE_PASSWORD }}').toBe(true);
  });
  it('supplies the Apple RevenueCat public key to the static production build', () => {
    const build = workflow.split('- name: Build Next.js Static Export')[1]?.split('- name:')[0];
    expect(build?.includes('NEXT_PUBLIC_REVENUECAT_IOS_KEY: ${{ secrets.NEXT_PUBLIC_REVENUECAT_IOS_KEY }}')).toBe(true);
  });
  it('fails before signing when required configuration is missing without printing secrets', () => {
    const result = runPreflight({ APPLE_CERTIFICATE_PASSWORD: configured.APPLE_CERTIFICATE_PASSWORD });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing release configuration:');
    expect(result.stderr).toContain('NEXT_PUBLIC_REVENUECAT_IOS_KEY');
    expect(result.stderr).not.toContain(configured.APPLE_CERTIFICATE_PASSWORD);
  });
  it('rejects a test-store key or a different Supabase project', () => {
    for (const override of [{ NEXT_PUBLIC_REVENUECAT_IOS_KEY: 'test_synthetic' },
      { NEXT_PUBLIC_SUPABASE_URL: 'https://different.supabase.co' }]) {
      const result = runPreflight({ ...configured, ...override });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Invalid release configuration:');
      expect(result.stderr).not.toContain('synthetic-password');
    }
  });
  it('accepts configured inputs without logging their values', () => {
    const result = runPreflight(configured);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Release configuration present');
    expect(result.stdout).not.toContain('synthetic');
  });
});
