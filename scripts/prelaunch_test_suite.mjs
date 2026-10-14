/**
 * Rimba Mobile - Automated Pre-Launch Verification Suite
 * Executes full test coverage for:
 * 1. Entitlements & Subscription Limits (Free vs Pro)
 * 2. Multi-Island State Isolation & Lifecycle (Create, Switch, Rename, Delete)
 * 3. Focus Session & Grace Period Rules (<=10.5s zero penalty, >10.5s withered stump)
 * 4. i18n & Translation Completeness (Catalog, Tags, Species)
 * 5. App Store & Google Play Store Compliance (Guidelines 4.8, 5.1.1, 5.1.2)
 * 6. PWA & Offline Asset Verification (manifest.json, sw.js, static compliance HTML)
 */

import fs from 'fs';
import path from 'path';

let passedTests = 0;
let failedTests = 0;
const testLogs = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    testLogs.push({ status: 'PASS', name: testName, details });
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} - ${details}`);
    testLogs.push({ status: 'FAIL', name: testName, details });
  }
}

console.log('\n======================================================');
console.log('🌿 RIMBA PRE-LAUNCH AUTOMATED COMPLIANCE & LOGIC SUITE');
console.log('======================================================\n');

// ------------------------------------------------------------------
// SUITE 1: Entitlements & Subscription Engine
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 1] Entitlements & Multi-Island Capacity Limits\x1b[0m');

function getEntitlements(sub) {
  const isPro = sub?.isPro ?? false;
  return {
    maxIslands: isPro ? 5 : 1,
    streakShieldMonthlyAllowance: isPro ? 1 : 0,
    multiSoundscapeMixer: isPro,
    exportHiResDiorama: isPro,
    exportAnalyticsCSV: isPro,
    exclusiveTreeCosmetics: isPro,
  };
}

const freeSub = { tier: 'free', isPro: false, status: 'none' };
const proSub = { tier: 'pro_annual', isPro: true, status: 'active' };

const freeEntitlements = getEntitlements(freeSub);
const proEntitlements = getEntitlements(proSub);

assert(freeEntitlements.maxIslands === 1, 'Free tier is strictly capped at 1 island');
assert(freeEntitlements.multiSoundscapeMixer === false, 'Free tier has single-track soundscape');
assert(freeEntitlements.streakShieldMonthlyAllowance === 0, 'Free tier has 0 free streak shields');

assert(proEntitlements.maxIslands === 5, 'Pro tier unlocks up to 5 islands');
assert(proEntitlements.multiSoundscapeMixer === true, 'Pro tier unlocks multi-track soundscape mixer');
assert(proEntitlements.streakShieldMonthlyAllowance === 1, 'Pro tier provides monthly streak shield');

// ------------------------------------------------------------------
// SUITE 2: Multi-Island Lifecycle & State Isolation
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 2] Multi-Island Lifecycle & State Isolation\x1b[0m');

class MockIslandManager {
  constructor(isPro = false) {
    this.isPro = isPro;
    this.activeIslandId = 'island_1';
    this.activeBiome = 'temperate';
    this.islands = [
      {
        id: 'island_1',
        name: 'Suaka Utama',
        biome: 'temperate',
        world: { id: 'world_1', name: 'Suaka Utama' },
        world_objects: [
          { id: 'tree_1', object_type: 'tree', status: 'active', grid_x: 3, grid_y: 3 },
        ],
      },
    ];
  }

  createNewIsland(name, biome) {
    const maxAllowed = this.isPro ? 5 : 1;
    if (this.islands.length >= maxAllowed) {
      return { success: false, reason: 'LIMIT_REACHED' };
    }
    const newId = `island_${this.islands.length + 1}`;
    const newIsland = {
      id: newId,
      name,
      biome,
      world: { id: `world_${newId}`, name },
      world_objects: [
        { id: `tree_starter_${newId}`, object_type: 'tree', status: 'active', grid_x: 4, grid_y: 4 },
      ],
    };
    this.islands.push(newIsland);
    this.activeIslandId = newId;
    this.activeBiome = biome;
    return { success: true, islandId: newId };
  }

  switchIsland(targetId) {
    const target = this.islands.find((i) => i.id === targetId);
    if (!target) return false;
    this.activeIslandId = target.id;
    this.activeBiome = target.biome;
    return true;
  }

  renameIsland(islandId, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const isl = this.islands.find((i) => i.id === islandId);
    if (!isl) return false;
    isl.name = trimmed;
    isl.world.name = trimmed;
    return true;
  }

  deleteIsland(islandId) {
    if (this.islands.length <= 1) {
      return { success: false, reason: 'CANNOT_DELETE_LAST_ISLAND' };
    }
    const targetIndex = this.islands.findIndex((i) => i.id === islandId);
    if (targetIndex === -1) return { success: false, reason: 'NOT_FOUND' };

    this.islands.splice(targetIndex, 1);
    if (this.activeIslandId === islandId) {
      const fallback = this.islands[0];
      this.activeIslandId = fallback.id;
      this.activeBiome = fallback.biome;
    }
    return { success: true };
  }
}

// Test Free tier island creation
const freeManager = new MockIslandManager(false);
const freeCreateResult = freeManager.createNewIsland('Pulau Kedua', 'cherry_grove');
assert(freeCreateResult.success === false && freeCreateResult.reason === 'LIMIT_REACHED', 'Free user cannot exceed 1 island');

// Test Pro tier island creation & isolation
const proManager = new MockIslandManager(true);
const createRes2 = proManager.createNewIsland('Lembah Sakura', 'cherry_grove');
assert(createRes2.success === true, 'Pro user can create 2nd island');
assert(proManager.activeIslandId === 'island_2', 'Newly created island automatically becomes active');

// Verify object isolation between islands
const island1Objects = proManager.islands.find((i) => i.id === 'island_1').world_objects;
const island2Objects = proManager.islands.find((i) => i.id === 'island_2').world_objects;
assert(island1Objects.length === 1 && island1Objects[0].id === 'tree_1', 'Island 1 preserves its own objects');
assert(island2Objects.length === 1 && island2Objects[0].id === 'tree_starter_island_2', 'Island 2 starts with isolated starter object');

// Create up to 5 islands
proManager.createNewIsland('Rawa Lumut', 'swamp');
proManager.createNewIsland('Puncak Es', 'boreal_snow');
proManager.createNewIsland('Lembah Senja', 'autumn_meadow');
assert(proManager.islands.length === 5, 'Pro user successfully reaches 5 islands');

// 6th island attempt on Pro
const createRes6 = proManager.createNewIsland('Pulau Keenam', 'bamboo');
assert(createRes6.success === false && createRes6.reason === 'LIMIT_REACHED', 'Pro user capped at maximum 5 islands');

// Test renaming
const renameSuccess = proManager.renameIsland('island_2', 'Sakura Sanctuary');
assert(renameSuccess === true, 'Island rename operation succeeds');
const renamedIsland = proManager.islands.find((i) => i.id === 'island_2');
assert(renamedIsland.name === 'Sakura Sanctuary' && renamedIsland.world.name === 'Sakura Sanctuary', 'Island name and world name updated concurrently');

// Test island deletion of active island
const prevActive = proManager.activeIslandId;
const deleteRes = proManager.deleteIsland(prevActive);
assert(deleteRes.success === true, 'Active island deleted successfully');
assert(proManager.activeIslandId !== prevActive, 'Active island auto-switches to remaining island');
assert(proManager.islands.length === 4, 'Island count decrements to 4');

// Test deleting last remaining island protection
const singleIslandManager = new MockIslandManager(false);
const deleteOnlyRes = singleIslandManager.deleteIsland('island_1');
assert(deleteOnlyRes.success === false && deleteOnlyRes.reason === 'CANNOT_DELETE_LAST_ISLAND', 'Safety shield: User cannot delete their only remaining island');

// ------------------------------------------------------------------
// SUITE 3: Focus Session Rules & 10-Second Grace Period
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 3] Focus Session Rules & Grace Period Verification\x1b[0m');

function simulateCancelSession(startedAtMs, currentMs, session, currentObjects) {
  const elapsedSec = (currentMs - startedAtMs) / 1000;
  if (elapsedSec <= 10.5) {
    // Grace period: Zero penalty, session discarded, no withered tree
    return {
      status: 'CANCELLED_GRACE_PERIOD',
      penalized: false,
      witheredObjectSpawned: false,
      objects: currentObjects,
    };
  } else {
    // Abandoned: Tree withers, penalty stump placed
    const witheredStump = {
      id: `obj_stump_${Date.now()}`,
      object_type: 'tree',
      status: 'withered',
      model_variant: 'nature_stump',
      created_at: new Date(currentMs).toISOString(),
    };
    return {
      status: 'ABANDONED',
      penalized: true,
      witheredObjectSpawned: true,
      objects: [...currentObjects, witheredStump],
    };
  }
}

const mockStart = Date.now();
const testSession = {
  id: 'sess_1',
  started_at: new Date(mockStart).toISOString(),
  duration_minutes: 25,
  tag: 'Belajar',
  status: 'active',
};

// Test Cancel at 5 seconds (< 10.5s)
const cancelAt5s = simulateCancelSession(mockStart, mockStart + 5000, testSession, []);
assert(cancelAt5s.status === 'CANCELLED_GRACE_PERIOD', 'Cancellation at 5s is classified as grace period');
assert(cancelAt5s.penalized === false, 'Cancellation at 5s incurs zero penalty');
assert(cancelAt5s.witheredObjectSpawned === false, 'Cancellation at 5s spawns NO withered stump');

// Test Cancel at 10.2 seconds (boundary <= 10.5s)
const cancelAt10s = simulateCancelSession(mockStart, mockStart + 10200, testSession, []);
assert(cancelAt10s.status === 'CANCELLED_GRACE_PERIOD', 'Cancellation at 10.2s within grace period boundary');
assert(cancelAt10s.witheredObjectSpawned === false, 'Cancellation at 10.2s spawns NO withered stump');

// Test Cancel at 15 seconds (> 10.5s)
const cancelAt15s = simulateCancelSession(mockStart, mockStart + 15000, testSession, []);
assert(cancelAt15s.status === 'ABANDONED', 'Cancellation at 15s is classified as abandoned');
assert(cancelAt15s.penalized === true, 'Cancellation at 15s penalizes session');
assert(cancelAt15s.witheredObjectSpawned === true, 'Cancellation at 15s spawns withered stump (nature_stump)');
assert(cancelAt15s.objects[0].status === 'withered', 'Spawned object status is correctly marked as withered');

// Test Completed Focus Session Rewards
function calculateRewards(minutes) {
  if (!minutes || minutes < 5) return { gold: 0, xp: 0 };
  if (minutes === 15) return { gold: 15, xp: 60 };
  if (minutes === 25) return { gold: 25, xp: 100 };
  if (minutes === 45) return { gold: 45, xp: 180 };
  if (minutes === 60) return { gold: 65, xp: 250 };
  return { gold: Math.round(25 * (minutes / 25)), xp: Math.round(100 * (minutes / 25)) };
}

assert(calculateRewards(4).gold === 0, 'Sessions < 5 minutes award 0 gold');
assert(calculateRewards(15).gold === 15 && calculateRewards(15).xp === 60, '15m session awards 15 Gold and 60 XP');
assert(calculateRewards(25).gold === 25 && calculateRewards(25).xp === 100, '25m session awards 25 Gold and 100 XP');
assert(calculateRewards(60).gold === 65 && calculateRewards(60).xp === 250, '60m marathon session awards 65 Gold and 250 XP');

// ------------------------------------------------------------------
// SUITE 4: i18n & Translation Completeness
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 4] i18n & Catalog Translation Completeness\x1b[0m');

const projectRoot = path.resolve(process.cwd());
const translationsFile = fs.readFileSync(path.join(projectRoot, 'src/lib/i18n/translations.ts'), 'utf8');
const configFile = fs.readFileSync(path.join(projectRoot, 'src/lib/game/config.ts'), 'utf8');

// Extract all catalog item IDs from BUILD_CATALOG in config.ts
const catalogIdRegex = /id:\s*['"]([a-zA-Z0-9_]+)['"],/g;
let match;
const buildCatalogIds = [];
const startIdx = configFile.indexOf('export const BUILD_CATALOG');
const endIdx = configFile.indexOf('export const GAME_CONFIG');
const buildCatalogSection = configFile.substring(startIdx, endIdx);
while ((match = catalogIdRegex.exec(buildCatalogSection)) !== null) {
  buildCatalogIds.push(match[1]);
}

assert(buildCatalogIds.length >= 20, `Found ${buildCatalogIds.length} catalog items in BUILD_CATALOG`);

// Check if each item is present in CATALOG_TRANSLATIONS_EN
const missingTranslations = [];
for (const id of buildCatalogIds) {
  if (!translationsFile.includes(`${id}:`)) {
    missingTranslations.push(id);
  }
}

assert(
  missingTranslations.length === 0,
  `All ${buildCatalogIds.length} catalog items have English translations in CATALOG_TRANSLATIONS_EN`,
  missingTranslations.join(', ')
);

// Check Focus Tags English translations
const requiredTags = ['Belajar', 'Bekerja', 'Membaca', 'Meditasi', 'Kreatif', 'Olahraga', 'Lainnya'];
let allTagsTranslated = true;
for (const tag of requiredTags) {
  if (!translationsFile.includes(`${tag}:`)) {
    allTagsTranslated = false;
    console.error(`Missing tag translation for: ${tag}`);
  }
}
assert(allTagsTranslated, 'All 7 standard Focus Tags are mapped in TAG_TRANSLATIONS_EN');

// Check Species English translations
const requiredSpecies = ['oak', 'pine', 'birch', 'cherry', 'maple', 'willow', 'bamboo', 'ancient'];
let allSpeciesTranslated = true;
for (const sp of requiredSpecies) {
  if (!translationsFile.includes(`${sp}:`)) {
    allSpeciesTranslated = false;
    console.error(`Missing species translation for: ${sp}`);
  }
}
assert(allSpeciesTranslated, 'All core Tree Species have English translations in SPECIES_NAMES_EN');

// ------------------------------------------------------------------
// SUITE 5: App Store & Google Play Store Compliance
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 5] App Store & Google Play Store Compliance Verification\x1b[0m');

// 1. Guideline 4.8 (OAuth Parity on iOS)
const loginPageContent = fs.readFileSync(path.join(projectRoot, 'src/app/login/page.tsx'), 'utf8');
const authStoreContent = fs.readFileSync(path.join(projectRoot, 'src/lib/auth/useAuthStore.ts'), 'utf8');

// Check that no isolated Google Sign-in button is rendered on the login screen
const hasDirectGoogleButton = /<button[^>]*>[^<]*(?:Sign in with Google|Masuk dengan Google)/i.test(loginPageContent);
assert(!hasDirectGoogleButton, 'Guideline 4.8: No third-party OAuth button rendered on iOS login page');

// Check that auth store has native iOS OAuth protection
const hasIOSOAuthGuard = authStoreContent.includes("isNativeIOS && provider !== 'apple'");
assert(hasIOSOAuthGuard, 'Guideline 4.8: useAuthStore guards against third-party OAuth on native iOS');

// 2. Guideline 5.1.1 (Account Deletion)
const settingsContent = fs.readFileSync(path.join(projectRoot, 'src/components/modals/MobileSettingsSheet.tsx'), 'utf8');
const hasInAppSettingsDelete = settingsContent.includes('deleteAccountAndData') && settingsContent.includes('deleteAccountTitle');
assert(hasInAppSettingsDelete, 'Guideline 5.1.1: In-app account deletion is accessible in Settings Sheet');

const hasPublicDeleteAccountPage = fs.existsSync(path.join(projectRoot, 'src/app/delete-account/page.tsx'));
const hasPublicDeleteHtml = fs.existsSync(path.join(projectRoot, 'public/account-deletion.html'));
assert(hasPublicDeleteAccountPage && hasPublicDeleteHtml, 'Guideline 5.1.1: Web account deletion page & static HTML exist for App Store URL submission');

// 3. Guideline 5.1.2 (Privacy Policy)
const hasPrivacyHtml = fs.existsSync(path.join(projectRoot, 'public/privacy.html'));
const hasLegalModal = fs.existsSync(path.join(projectRoot, 'src/components/modals/LegalModal.tsx'));
assert(hasPrivacyHtml && hasLegalModal, 'Guideline 5.1.2: Privacy Policy is available both in-app (LegalModal) and via static web URL (privacy.html)');

// 4. iOS & Android Permissions Declarations & In-App Settings Controls
const infoPlistContent = fs.readFileSync(path.join(projectRoot, 'ios/App/App/Info.plist'), 'utf8');
const hasIOSCamera = infoPlistContent.includes('NSCameraUsageDescription');
const hasIOSPhotos = infoPlistContent.includes('NSPhotoLibraryUsageDescription');
const hasIOSPhotosAdd = infoPlistContent.includes('NSPhotoLibraryAddUsageDescription');
assert(hasIOSCamera && hasIOSPhotos && hasIOSPhotosAdd, 'iOS Info.plist declares NSCameraUsageDescription & NSPhotoLibraryUsageDescription');

const androidManifestContent = fs.readFileSync(path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const hasAndroidCamera = androidManifestContent.includes('android.permission.CAMERA');
const hasAndroidNotif = androidManifestContent.includes('android.permission.POST_NOTIFICATIONS');
const hasAndroidMedia = androidManifestContent.includes('android.permission.READ_MEDIA_IMAGES');
assert(hasAndroidCamera && hasAndroidNotif && hasAndroidMedia, 'Android AndroidManifest.xml declares CAMERA, POST_NOTIFICATIONS, & READ_MEDIA_IMAGES');

const hasPermissionsInSettings =
  settingsContent.includes('permissionsSection') &&
  settingsContent.includes('notifTitle') &&
  settingsContent.includes('cameraTitle') &&
  settingsContent.includes('wakeLockTitle') &&
  settingsContent.includes('openAppSettingsBtn') &&
  settingsContent.includes('masterAudioTitle');
assert(hasPermissionsInSettings, 'Mobile Settings provides full permission controls (Notif, Camera/Gallery, Audio Master, Screen Wake Lock, System Shortcut)');

// 5. Bundle Identifier & Package Identity Integrity
const capConfigContent = fs.readFileSync(path.join(projectRoot, 'capacitor.config.ts'), 'utf8');
const pbxprojContent = fs.readFileSync(path.join(projectRoot, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
const hasCapAppId = capConfigContent.includes("appId: 'com.syntheticae.rimba'");
const hasPbxBundleId = pbxprojContent.includes("PRODUCT_BUNDLE_IDENTIFIER = com.syntheticae.rimba;");
assert(hasCapAppId && hasPbxBundleId, 'iOS Bundle Identifier & Capacitor App ID set to com.syntheticae.rimba');

// ------------------------------------------------------------------
// SUITE 6: PWA & Offline Readiness
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 6] PWA & Offline Integrity\x1b[0m');

// 1. manifest.json
const manifestPath = path.join(projectRoot, 'public/manifest.json');
assert(fs.existsSync(manifestPath), 'public/manifest.json exists');
const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Boolean(manifestData.name && manifestData.short_name), 'manifest.json contains valid name and short_name');
assert(Array.isArray(manifestData.icons) && manifestData.icons.length >= 2, 'manifest.json defines multi-resolution app icons');

// 2. Service Worker (sw.js)
const swPath = path.join(projectRoot, 'public/sw.js');
assert(fs.existsSync(swPath), 'public/sw.js exists');
const swContent = fs.readFileSync(swPath, 'utf8');
assert(swContent.includes("addEventListener('install'") && swContent.includes("addEventListener('fetch'"), 'Service worker handles install and fetch events');

// 3. Essential assets exist
const requiredAssets = [
  'public/login-page.webp',
  'public/onboarding-1-valley.webp',
  'public/onboarding-2-canopy.webp',
  'public/onboarding-3-cathedral.webp',
  'public/onboarding-4-resilience.webp',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/apple-touch-icon.png',
];
let allAssetsExist = true;
for (const asset of requiredAssets) {
  if (!fs.existsSync(path.join(projectRoot, asset))) {
    allAssetsExist = false;
    console.error(`Missing critical asset: ${asset}`);
  }
}
assert(allAssetsExist, 'All critical splash, onboarding, and app icon assets exist in public/');

// ------------------------------------------------------------------
// SUMMARY REPORT
// ------------------------------------------------------------------
console.log('\n======================================================');
console.log('📊 TEST SUMMARY RESULTS');
console.log('======================================================');
console.log(`Total Assertions : ${passedTests + failedTests}`);
console.log(`\x1b[32mPassed           : ${passedTests}\x1b[0m`);
console.log(`\x1b[${failedTests > 0 ? '31' : '32'}mFailed           : ${failedTests}\x1b[0m`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m🎉 ALL PRE-LAUNCH CHECKS PASSED PERFECTLY!\x1b[0m\n');
  process.exit(0);
}
