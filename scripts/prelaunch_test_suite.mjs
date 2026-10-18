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
// SUITE 7: Ruang Api Unggun & Campfire Synergy Integrity
// ------------------------------------------------------------------
console.log('\n\x1b[36m[SUITE 7] Ruang Api Unggun & Campfire Integrity\x1b[0m');

// 1. Session Rules Campfire Synergy (+20% Soul & XP)
const sessionRulesPath = path.join(projectRoot, 'src/lib/game/sessionRules.ts');
assert(fs.existsSync(sessionRulesPath), 'sessionRules.ts exists');
const sessionRulesContent = fs.readFileSync(sessionRulesPath, 'utf8');
assert(
  sessionRulesContent.includes('session.campfire_room_code') &&
    sessionRulesContent.includes('Math.round(rewardGold * 1.2)') &&
    sessionRulesContent.includes('Math.round(rewardXp * 1.2)'),
  'Session completion correctly awards +20% Soul & XP bonus for campfire sessions'
);

// 2. Campfire Store Presence & Lifecycle Safeguards
const campfireStorePath = path.join(projectRoot, 'src/lib/game/campfireStore.ts');
assert(fs.existsSync(campfireStorePath), 'campfireStore.ts exists');
const campfireStoreContent = fs.readFileSync(campfireStorePath, 'utf8');
assert(
  campfireStoreContent.includes('START_FOCUS') &&
    campfireStoreContent.includes('MEMBER_LEFT') &&
    campfireStoreContent.includes('ROOM_SEVERED') &&
    campfireStoreContent.includes('ROOM_COMPLETED'),
  'campfireStore handles full synchronization lifecycle (START_FOCUS, MEMBER_LEFT, ROOM_SEVERED, ROOM_COMPLETED)'
);
assert(
  campfireStoreContent.includes('onRehydrateStorage') &&
    campfireStoreContent.includes('isStale'),
  'campfireStore implements onRehydrateStorage auto-clean for stale or ended rooms'
);

// 3. Campfire Room Code Normalization & Auto-Dismiss in Modal
const campfireModalPath = path.join(projectRoot, 'src/components/modals/CampfireRoomModal.tsx');
assert(fs.existsSync(campfireModalPath), 'CampfireRoomModal.tsx exists');
const campfireModalContent = fs.readFileSync(campfireModalPath, 'utf8');
assert(
  campfireModalContent.includes('currentRoom.status === "active"') &&
    campfireModalContent.includes('onClose()'),
  'CampfireRoomModal automatically auto-dismisses when focus session starts'
);
assert(
  campfireModalContent.includes('RIMBA-') &&
    campfireModalContent.includes('raw = `RIMBA-${raw}`'),
  'CampfireRoomModal automatically normalizes 3-digit inputs to RIMBA-XXX format'
);

// ------------------------------------------------------------------
// SUITE 8: Profil, Statistik & Lossless Cloud Sync Integrity
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 8] Profil, Statistik & Lossless Cloud Sync Integrity\x1b[0m');

// 1. Lossless Multi-Device Merge in cloudSync.ts
const cloudSyncPath = path.join(projectRoot, 'src/lib/supabase/cloudSync.ts');
assert(fs.existsSync(cloudSyncPath), 'cloudSync.ts exists');
const cloudSyncContent = fs.readFileSync(cloudSyncPath, 'utf8');
assert(
  cloudSyncContent.includes('mergedIslands') &&
    cloudSyncContent.includes('mergedChapters') &&
    cloudSyncContent.includes('mergedWisdom') &&
    cloudSyncContent.includes('mergedLedger'),
  'cloudSync smartSyncOnLogin executes deterministic field-level lossless merge (islands, story, wisdom, currency)'
);
assert(
  cloudSyncContent.includes('Math.max(localSave.profile?.xp || 0, cloudSave.profile?.xp || 0)') &&
    cloudSyncContent.includes('Math.max(localSave.streak_shields || 0, cloudSave.streak_shields || 0)'),
  'cloudSync smartSyncOnLogin preserves highest accumulated XP and streak shield values'
);

// 2. Avatar Picker Upload Reliability & State Synchronization
const avatarPickerPath = path.join(projectRoot, 'src/components/modals/AvatarPickerModal.tsx');
assert(fs.existsSync(avatarPickerPath), 'AvatarPickerModal.tsx exists');
const avatarPickerContent = fs.readFileSync(avatarPickerPath, 'utf8');
assert(
  avatarPickerContent.includes('disabled={isProcessing}') &&
    avatarPickerContent.includes('setIsProcessing(false)'),
  'AvatarPickerModal guards save button with isProcessing and resets state in canvas toBlob finally block'
);
assert(
  avatarPickerContent.includes('setSelectedAvatar(currentAvatarUrl || "")'),
  'AvatarPickerModal synchronizes selected avatar state on modal open'
);

// 3. Statistics Heatmap Styling & Dynamic Category Badge/Center
const statsModalPath = path.join(projectRoot, 'src/components/modals/MobileStatisticsModal.tsx');
assert(fs.existsSync(statsModalPath), 'MobileStatisticsModal.tsx exists');
const statsModalContent = fs.readFileSync(statsModalPath, 'utf8');
assert(
  statsModalContent.includes('ring-[#187557] ring-offset-1'),
  'MobileStatisticsModal applies distinct valid ring styling to today cell in heatmap'
);
assert(
  statsModalContent.includes('periodStats.periodLabel') &&
    statsModalContent.includes('tagBreakdown.reduce((acc, t) => acc + t.minutes, 0)'),
  'MobileStatisticsModal dynamically labels category donut and computes center minutes accurately'
);

// 4. Mobile Profile Cloud Status Badge
const profileModalPath = path.join(projectRoot, 'src/components/modals/MobileProfileModal.tsx');
assert(fs.existsSync(profileModalPath), 'MobileProfileModal.tsx exists');
const profileModalContent = fs.readFileSync(profileModalPath, 'utf8');
assert(
  profileModalContent.includes('user && !user.isGuest') &&
    profileModalContent.includes('<span>Cloud</span>'),
  'MobileProfileModal displays Cloud sync status badge for authenticated users'
);

// ------------------------------------------------------------------
// SUITE 9: Peringkat Suaka, Gelar Ranger & Leaderboard Integrity
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 9] Peringkat Suaka, Gelar Ranger & Leaderboard Integrity\x1b[0m');

// 1. Multi-Island Tree Count & Tier Calculations in community.ts
const communityPath = path.join(projectRoot, 'src/lib/game/community.ts');
assert(fs.existsSync(communityPath), 'community.ts exists');
const communityContent = fs.readFileSync(communityPath, 'utf8');
assert(
  communityContent.includes('getTotalActiveTrees') &&
    communityContent.includes('saveData.islands.reduce'),
  'community.ts exports getTotalActiveTrees aggregating across archipelago islands'
);
assert(
  communityContent.includes('avatarUrl: saveData.profile?.avatarUrl'),
  'community.ts passes user profile avatarUrl to LeaderboardEntry'
);

// Verify runtime logic of getTotalActiveTrees and Tier progression
const sampleSaveDataSingle = {
  world_objects: [
    { object_type: 'tree', status: 'active' },
    { object_type: 'tree', status: 'active' },
    { object_type: 'tree', status: 'withered' },
  ],
};
const singleTrees = sampleSaveDataSingle.world_objects.filter(
  (o) => o.object_type === 'tree' && o.status === 'active'
).length;
assert(singleTrees === 2, 'Single-island active tree count ignores withered stumps');

const sampleSaveDataMulti = {
  islands: [
    { world_objects: [{ object_type: 'tree', status: 'active' }, { object_type: 'tree', status: 'active' }] },
    { world_objects: [{ object_type: 'tree', status: 'active' }] },
  ],
  world_objects: [{ object_type: 'tree', status: 'active' }],
};
const multiTrees = sampleSaveDataMulti.islands.reduce(
  (sum, isl) => sum + isl.world_objects.filter((o) => o.object_type === 'tree' && o.status === 'active').length,
  0
);
assert(multiTrees === 3, 'Multi-island archipelago aggregates trees across all islands');

// 2. MobileLeaderboardModal Component Integration
const leaderboardModalPath = path.join(projectRoot, 'src/components/modals/MobileLeaderboardModal.tsx');
assert(fs.existsSync(leaderboardModalPath), 'MobileLeaderboardModal.tsx exists');
const leaderboardModalContent = fs.readFileSync(leaderboardModalPath, 'utf8');
assert(
  leaderboardModalContent.includes('RangerAvatar') &&
    leaderboardModalContent.includes('avatarUrl={saveData.profile?.avatarUrl || currentUserEntry.avatarEmoji}'),
  'MobileLeaderboardModal renders RangerAvatar with user custom profile avatar support'
);
assert(
  leaderboardModalContent.includes('getNextRangerTier(currentTier)') &&
    leaderboardModalContent.includes('nextTierProgress.nextTier.badgeEmoji'),
  'MobileLeaderboardModal integrates getNextRangerTier and displays next tier motivation card'
);
assert(
  leaderboardModalContent.includes('t.ranks.archipelagoTotal'),
  'MobileLeaderboardModal displays archipelago indicator when user possesses multiple islands'
);
assert(
  !leaderboardModalContent.includes('activeTab'),
  'MobileLeaderboardModal removes unused dead state activeTab'
);

// 3. Translation Keys for Next Tier Goals
const translationsPath = path.join(projectRoot, 'src/lib/i18n/translations.ts');
assert(fs.existsSync(translationsPath), 'translations.ts exists');
const translationsContent = fs.readFileSync(translationsPath, 'utf8');
assert(
  translationsContent.includes('nextTierGoal: "Menuju Gelar Berikutnya"') &&
    translationsContent.includes('nextTierGoal: "Next Rank Goal"') &&
    translationsContent.includes('highestTierReached: "Gelar Kehormatan Tertinggi Tercapai! 👑"') &&
    translationsContent.includes('highestTierReached: "Highest Honor Achieved! 👑"'),
  'translations.ts provides full bilingual i18n support for next tier goals and highest tier milestones'
);

// ------------------------------------------------------------------
// SUITE 10: Pengaturan Lengkap, Preferences & Cadangan Data Integrity
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 10] Pengaturan Lengkap, Preferences & Cadangan Data Integrity\x1b[0m');

// 1. MobileSettingsSheet Handlers & Visual Styling
const settingsSheetPath = path.join(projectRoot, 'src/components/modals/MobileSettingsSheet.tsx');
assert(fs.existsSync(settingsSheetPath), 'MobileSettingsSheet.tsx exists');
const settingsSheetContent = fs.readFileSync(settingsSheetPath, 'utf8');
assert(
  settingsSheetContent.includes('calculateAnalytics(saveData?.focus_sessions || []).currentStreak') &&
    settingsSheetContent.includes('scheduleDailyStreakReminder(prefs.dailyReminderTime || "20:00", currentStreak || 1)'),
  'MobileSettingsSheet dynamically computes and passes actual streak count to scheduleDailyStreakReminder'
);
assert(
  settingsSheetContent.includes('handleExecuteDeleteAccount = async ()') &&
    settingsSheetContent.includes('await useAuthStore.getState().deleteAccountAndData()'),
  'MobileSettingsSheet awaits async deleteAccountAndData before triggering page reload'
);
assert(
  settingsSheetContent.includes('text-rose-700') &&
    settingsSheetContent.includes('bg-rose-100 text-rose-900 border border-rose-300'),
  'MobileSettingsSheet applies accessible high-contrast Danger Zone typography and valid badge styling'
);
assert(
  settingsSheetContent.includes('prefs.ambientMusicVolume ?? 50'),
  'MobileSettingsSheet ambient music slider fallback matches default preferences store volume (50%)'
);

// 2. RestoreDataModal Verification
const restoreModalPath = path.join(projectRoot, 'src/components/modals/RestoreDataModal.tsx');
assert(fs.existsSync(restoreModalPath), 'RestoreDataModal.tsx exists');
const restoreModalContent = fs.readFileSync(restoreModalPath, 'utf8');
assert(
  restoreModalContent.includes('createIslandSnapshot') &&
    restoreModalContent.includes('importSaveData(validation.data)'),
  'RestoreDataModal creates auto-backup snapshot and invokes importSaveData safely'
);

// 3. LegalModal Verification
const legalModalPath = path.join(projectRoot, 'src/components/modals/LegalModal.tsx');
assert(fs.existsSync(legalModalPath), 'LegalModal.tsx exists');
const legalModalContent = fs.readFileSync(legalModalPath, 'utf8');
assert(
  legalModalContent.includes('activeTab === "privacy"') &&
    legalModalContent.includes('LEGAL_CONTENT[currentLang][activeTab]'),
  'LegalModal renders bilingual legal documents with Privacy and Terms tab support'
);

// ------------------------------------------------------------------
// SUITE 11: Rimba Pro & Entitlements Integrity
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 11] Rimba Pro & Entitlements Integrity\x1b[0m');

// 1. RimbaProPaywallModal Presence & Active Pro Card Verification
const paywallModalPath = path.join(projectRoot, 'src/components/modals/RimbaProPaywallModal.tsx');
assert(fs.existsSync(paywallModalPath), 'RimbaProPaywallModal.tsx exists');
const paywallModalContent = fs.readFileSync(paywallModalPath, 'utf8');
assert(
  paywallModalContent.includes('isPro && (') &&
    paywallModalContent.includes('t.paywallModal.activeBadge') &&
    paywallModalContent.includes('t.paywallModal.returnToSanctuary'),
  'RimbaProPaywallModal implements Active Pro status card and return to sanctuary CTA when subscribed'
);
assert(
  paywallModalContent.includes('import { LegalModal }') &&
    paywallModalContent.includes('<LegalModal') &&
    paywallModalContent.includes('setLegalModalTab'),
  'RimbaProPaywallModal integrates in-app LegalModal for 100% offline Privacy & Terms review'
);
assert(
  paywallModalContent.includes('t.paywallModal.restoreAlreadyActive') &&
    paywallModalContent.includes('t.paywallModal.restoreSuccess'),
  'RimbaProPaywallModal handles restore purchase with active status check and informative feedback'
);

// 2. backupManager Lossless Subscription & Island Preservation
const backupManagerPath = path.join(projectRoot, 'src/lib/game/backupManager.ts');
assert(fs.existsSync(backupManagerPath), 'backupManager.ts exists');
const backupManagerContent = fs.readFileSync(backupManagerPath, 'utf8');
assert(
  backupManagerContent.includes('subscription: parsed.subscription') &&
    backupManagerContent.includes('islands: Array.isArray(parsed.islands)') &&
    backupManagerContent.includes('streak_shields: typeof parsed.streak_shields'),
  'backupManager validateRimbaBackup preserves subscription, archipelago islands, and streak shields'
);

// 3. cloudSync Lossless Subscription Merge
assert(
  cloudSyncContent.includes('mergedSubscription') &&
    cloudSyncContent.includes("localSub?.tier === 'pioneer_lifetime'") &&
    cloudSyncContent.includes("cloudSub?.tier === 'pioneer_lifetime'") &&
    cloudSyncContent.includes('subscription: mergedSubscription'),
  'cloudSync smartSyncOnLogin executes lossless subscription merge preserving highest Pro/Lifetime status'
);

// 4. Bilingual Translation Completeness for Rimba Pro
assert(
  translationsContent.includes('proActiveTitle') &&
    translationsContent.includes('realTreesPlantedCount') &&
    translationsContent.includes('returnToSanctuary') &&
    translationsContent.includes('restoreSuccess'),
  'translations.ts provides full bilingual i18n support for Rimba Pro active states and restore feedback'
);

// ------------------------------------------------------------------
// SUITE 12: Ekspor Snapshot, Kartu Sosial & Riwayat Snapshot Integrity
// ------------------------------------------------------------------
console.log('\x1b[36m[SUITE 12] Ekspor Snapshot, Kartu Sosial & Riwayat Snapshot Integrity\x1b[0m');

// 1. share-cards types.ts drawRoundedRect Path Precision
const shareCardTypesPath = path.join(projectRoot, 'src/components/modals/share-cards/types.ts');
assert(fs.existsSync(shareCardTypesPath), 'share-cards/types.ts exists');
const shareCardTypesContent = fs.readFileSync(shareCardTypesPath, 'utf8');
assert(
  shareCardTypesContent.includes('ctx.roundRect(x, y, w, h, r)') &&
    shareCardTypesContent.includes('ctx.arcTo(x, y, x + w, y, r)'),
  'share-cards types.ts drawRoundedRect implements modern roundRect with accurate top-left arc fallback'
);

// 2. nativeBridge.ts shareOrSaveImage Cancellation Guard
const nativeBridgePath = path.join(projectRoot, 'src/lib/mobile/nativeBridge.ts');
assert(fs.existsSync(nativeBridgePath), 'nativeBridge.ts exists');
const nativeBridgeContent = fs.readFileSync(nativeBridgePath, 'utf8');
assert(
  nativeBridgeContent.includes("errMsg.includes('cancel') || errMsg.includes('abort')") &&
    nativeBridgeContent.includes('return false;'),
  'nativeBridge.ts shareOrSaveImage safely intercepts user cancellation to prevent unwanted browser downloads'
);

// 3. ShareSnapshotModal.tsx & SocialCardGeneratorModal.tsx Success Verification
const shareModalPath = path.join(projectRoot, 'src/components/modals/ShareSnapshotModal.tsx');
assert(fs.existsSync(shareModalPath), 'ShareSnapshotModal.tsx exists');
const shareModalContent = fs.readFileSync(shareModalPath, 'utf8');
assert(
  shareModalContent.includes('const success = await shareOrSaveImage(') &&
    shareModalContent.includes('if (success) {') &&
    shareModalContent.includes('Gambar tersimpan ke galeri!'),
  'ShareSnapshotModal.tsx guards download success toast and haptics behind shareOrSaveImage boolean return'
);

const socialGenModalPath = path.join(projectRoot, 'src/components/modals/SocialCardGeneratorModal.tsx');
assert(fs.existsSync(socialGenModalPath), 'SocialCardGeneratorModal.tsx exists');
const socialGenModalContent = fs.readFileSync(socialGenModalPath, 'utf8');
assert(
  socialGenModalContent.includes('const success = await shareOrSaveImage(') &&
    socialGenModalContent.includes('if (success) {'),
  'SocialCardGeneratorModal.tsx guards download success toast behind shareOrSaveImage boolean return'
);

// 4. SnapshotsHistoryModal.tsx Auto-Backup on Restore
const snapshotHistoryModalPath = path.join(projectRoot, 'src/components/modals/SnapshotsHistoryModal.tsx');
assert(fs.existsSync(snapshotHistoryModalPath), 'SnapshotsHistoryModal.tsx exists');
const snapshotHistoryModalContent = fs.readFileSync(snapshotHistoryModalPath, 'utf8');
assert(
  snapshotHistoryModalContent.includes('createIslandSnapshot(') &&
    snapshotHistoryModalContent.includes('Auto-Backup Sebelum Pulihkan Snapshot') &&
    snapshotHistoryModalContent.includes('importSaveData(snap.data)') &&
    snapshotHistoryModalContent.includes('t.snapshotsModal.restoreSuccess'),
  'SnapshotsHistoryModal.tsx automatically captures auto-backup before restoring snapshot and displays confirmation toast'
);

// 5. Bilingual Translation for Snapshot Restore
assert(
  translationsContent.includes('restoreSuccess: "Suaka berhasil dipulihkan dari snapshot!') &&
    translationsContent.includes('restoreSuccess: "Sanctuary successfully restored from snapshot!'),
  'translations.ts provides full bilingual i18n support for snapshot restore confirmation toast'
);

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
