// Synthetic-only browser acceptance. Never uses the owner's browser/profile or accounts.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { makeScreenshotStorage } from './native-screenshot-fixture.mjs';

const baseURL = process.env.RIMBA_QA_URL || 'http://127.0.0.1:41977';
const origin = new URL(baseURL).origin;
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw Error('UI QA requires localhost.');
const browser = await chromium.launch({ headless: true, ...(process.env.RIMBA_QA_BROWSER ? { executablePath: process.env.RIMBA_QA_BROWSER } : {}) });
await mkdir('build/ui-qa', { recursive: true });
try {
  for (const language of ['en', 'id']) {
    const text = language === 'en'
      ? { start: 'Start Focus', cancel: /^Cancel \(/, pause: 'Pause Session', resume: 'Resume Focus', profile: 'My Profile', deletion: 'Delete Account & Data', confirm: 'DELETE', cancelDelete: 'Cancel', logout: 'Sign Out', guest: 'Guest Mode (Offline)', settings: 'Settings' }
      : { start: 'Mulai Fokus', cancel: /^Batal \(/, pause: 'Jeda Sesi', resume: 'Lanjutkan Fokus', profile: 'Profil Saya', deletion: 'Hapus Akun & Data', confirm: 'HAPUS', cancelDelete: 'Batal', logout: 'Keluar', guest: 'Mode Tamu (Offline)', settings: 'Pengaturan' };
    const context = await browser.newContext({ viewport: language === 'en' ? { width: 390, height: 844 } : { width: 834, height: 1194 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    await page.addInitScript(values => {
      if (!localStorage.getItem('rimba_synthetic_qa')) {
        for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
        localStorage.setItem('rimba_synthetic_qa', 'true');
      }
    }, makeScreenshotStorage(language));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: text.start, exact: true }).waitFor({ timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: text.start, exact: true }).click();
      await page.getByRole('button', { name: text.pause, exact: true }).click();
      await page.getByRole('button', { name: text.resume, exact: true }).click();
      await page.getByRole('button', { name: text.cancel }).click();
      await page.getByRole('button', { name: text.start, exact: true }).waitFor();
    }
    await page.getByRole('button', { name: text.profile, exact: true }).click();
    await page.getByRole('dialog', { name: text.profile }).getByRole('button', { name: language === 'en' ? /^Upgrade to Pro/ : /^Langganan Pro/ }).click();
    await page.getByRole('dialog', { name: 'Rimba Pro', exact: true }).waitFor();
    await page.screenshot({path:`build/ui-qa/${language}-paywall.png`});
    await page.getByRole('dialog', { name: 'Rimba Pro', exact: true }).getByRole('button', { name: language === 'en' ? 'Close' : 'Tutup', exact: true }).click();
    await page.getByRole('button', { name: text.profile, exact: true }).click();
    await page.screenshot({ path: `build/ui-qa/${language}-menu.png` });
    await page.getByRole('dialog', { name: text.profile }).getByRole('button', { name: text.profile, exact: true }).click();
    await page.getByRole('button', { name: text.deletion, exact: true }).click();
    await page.getByPlaceholder(text.confirm, { exact: true }).fill(text.confirm);
    assert.equal(await page.getByRole('button', { name: language === 'en' ? 'Delete Permanently' : 'Hapus Permanen', exact: true }).isEnabled(), true);
    await page.screenshot({ path: `build/ui-qa/${language}-delete.png` });
    await page.getByRole('button', { name: text.cancelDelete, exact: true }).click();
    await page.getByRole('button', { name: text.logout, exact: true }).click();
    await page.getByRole('button', { name: text.guest }).waitFor({ timeout: 20000 }).catch(async error => {
      console.log('LOGOUT FAILURE',page.url(),await page.locator('body').innerText(),errors);
      await page.screenshot({path:`build/ui-qa/${language}-logout-failure.png`});
      throw error;
    });
    assert.match(page.url(), /\/login\/?(?:[?#]|$)/);
    await page.getByRole('button', { name: text.guest }).click();
    await page.getByRole('button', { name: text.start, exact: true }).waitFor();
    await page.getByRole('button', { name: text.settings, exact: true }).click();
    console.log(language, 'settings buttons:', await page.getByRole('dialog', { name: text.settings }).getByRole('button').allTextContents());
    assert.deepEqual(errors, [], 'No React/runtime error is allowed during the core flow');
    await page.screenshot({ path: `build/ui-qa/${language}-settings.png` });
    console.log(`PASS ${language}: repeat focus/pause/resume/cancel, profile, deletion cancel, sign-out and guest re-entry`);
    await context.close();
  }
} finally { await browser.close(); }
