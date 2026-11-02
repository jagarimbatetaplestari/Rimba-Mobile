import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

/**
 * Level & XP Progression Rules for Rimba
 * Provides progressive scaling curves and bilingual helper functions across all 20 levels.
 */

export const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0 XP
  100,    // Level 2: 100 XP
  250,    // Level 3: 250 XP
  470,    // Level 4: 470 XP
  770,    // Level 5: 770 XP
  1170,   // Level 6: 1,170 XP
  1690,   // Level 7: 1,690 XP
  2350,   // Level 8: 2,350 XP
  3170,   // Level 9: 3,170 XP
  4170,   // Level 10: 4,170 XP
  5370,   // Level 11: 5,370 XP
  6790,   // Level 12: 6,790 XP
  8450,   // Level 13: 8,450 XP
  10370,  // Level 14: 10,370 XP
  12570,  // Level 15: 12,570 XP - Grand Master
  15070,  // Level 16: 15,070 XP
  17870,  // Level 17: 17,870 XP
  21000,  // Level 18: 21,000 XP
  24500,  // Level 19: 24,500 XP
  28500,  // Level 20: 28,500 XP - Frost Sovereign
];

export const MAX_DEFINED_LEVEL = 20;

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp || 0);

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      if (i === LEVEL_THRESHOLDS.length - 1) {
        const excess = safeXp - LEVEL_THRESHOLDS[i];
        return MAX_DEFINED_LEVEL + Math.floor(excess / 2500);
      }
      return i + 1;
    }
  }

  return 1;
}

export interface LevelMetadata {
  level: number;
  title: string;
  badge: string;
  unlockRewardText: string;
}

export const LEVEL_METADATA: LevelMetadata[] = [
  { level: 1, title: 'Pemula Suaka', badge: '🌱', unlockRewardText: 'Bibit Pohon Oak Rimba & Kanopi Siang' },
  { level: 2, title: 'Penyemai Benih', badge: '🌿', unlockRewardText: 'Bibit Birch Perak & Semak Belukar' },
  { level: 3, title: 'Penjelajah Hening', badge: '🌾', unlockRewardText: 'Satwa Koala Pohon & Suara Alam Hutan' },
  { level: 4, title: 'Penjaga Aliran', badge: '💧', unlockRewardText: 'Batu Sungai Halus & Jalur Setapak Kayu' },
  { level: 5, title: 'Sahabat Satwa Agung', badge: '🦌', unlockRewardText: 'Rusa Mistis Rimba (Tanduk Bercahaya Zamrud)' },
  { level: 6, title: 'Pengembara Kanopi', badge: '🌲', unlockRewardText: 'Bibit Cemara Lembah & Tenda Kemah' },
  { level: 7, title: 'Penjaga Kabut Fajar', badge: '🌫️', unlockRewardText: 'Batu Lumut Zamrud & Flora Pakis' },
  { level: 8, title: 'Penenang Lembah', badge: '🌾', unlockRewardText: 'Bibit Akasia Sabana Emas' },
  { level: 9, title: 'Ksatria Angin Barat', badge: '🍃', unlockRewardText: 'Bibit Siprus Menara Angin' },
  { level: 10, title: 'Tetua Rimba', badge: '🏛️', unlockRewardText: 'Bibit Cemara Kabut Utara' },
  { level: 11, title: 'Penjaga Pesisir', badge: '🌴', unlockRewardText: 'Bibit Palem Tropis Pesisir' },
  { level: 12, title: 'Penyelaras Pulau', badge: '🥥', unlockRewardText: 'Bibit Kelapa Gading Pesisir' },
  { level: 13, title: 'Penjaga Mahkota Pinus', badge: '👑', unlockRewardText: 'Bibit Pinus Bertingkat Kerajaan' },
  { level: 14, title: 'Pelindung Baobab', badge: '✨', unlockRewardText: 'Bibit Baobab Sakral Raksasa' },
  { level: 15, title: 'Penjaga Rimba Abadi', badge: '🌟', unlockRewardText: 'Bibit Pohon Leluhur Kuno (Grandmaster)' },
  { level: 16, title: 'Penjaga Embun Beku', badge: '❄️', unlockRewardText: 'Bibit Cemara Gunung Berbatu' },
  { level: 17, title: 'Penenang Badai Salju', badge: '🌨️', unlockRewardText: 'Trio Batuan Beku Alpin' },
  { level: 18, title: 'Ksatria Puncak Es', badge: '🏔️', unlockRewardText: 'Pinus Salju Muda & Lumut Salju' },
  { level: 19, title: 'Tetua Gletser Abadi', badge: '💎', unlockRewardText: 'Pohon Bundar Salju & Rumpun Kristal' },
  { level: 20, title: 'Pelindung Salju Abadi', badge: '👑', unlockRewardText: 'Bioma Salju Abadi (Winter Wonderland) & Pinus Salju Abadi' },
];

export const LEVEL_METADATA_EN: LevelMetadata[] = [
  { level: 1, title: 'Sanctuary Novice', badge: '🌱', unlockRewardText: 'Rimba Oak Sapling & Daylight Canopy' },
  { level: 2, title: 'Seed Sower', badge: '🌿', unlockRewardText: 'Silver Birch Sapling & Meadow Shrubs' },
  { level: 3, title: 'Silent Explorer', badge: '🌾', unlockRewardText: 'Sanctuary Koala & Woodland Nature Sounds' },
  { level: 4, title: 'Stream Keeper', badge: '💧', unlockRewardText: 'Smooth River Stones & Wooden Trail' },
  { level: 5, title: 'Noble Fauna Friend', badge: '🦌', unlockRewardText: 'Mystic Rimba Stag (Emerald Glowing Antlers)' },
  { level: 6, title: 'Canopy Wanderer', badge: '🌲', unlockRewardText: 'Valley Pine Sapling & Camping Tent' },
  { level: 7, title: 'Dawn Mist Keeper', badge: '🌫️', unlockRewardText: 'Emerald Mossy Boulders & Fern Flora' },
  { level: 8, title: 'Valley Soother', badge: '🌾', unlockRewardText: 'Golden Savanna Acacia Sapling' },
  { level: 9, title: 'West Wind Knight', badge: '🍃', unlockRewardText: 'Windspire Cypress Sapling' },
  { level: 10, title: 'Rimba Elder', badge: '🏛️', unlockRewardText: 'Nordic Mist Spruce Sapling' },
  { level: 11, title: 'Coastal Warden', badge: '🌴', unlockRewardText: 'Coastal Tropical Palm Sapling' },
  { level: 12, title: 'Island Harmonizer', badge: '🥥', unlockRewardText: 'Island Ivory Coconut Sapling' },
  { level: 13, title: 'Pine Crown Guardian', badge: '👑', unlockRewardText: 'Royal Tiered Pine Sapling' },
  { level: 14, title: 'Baobab Protector', badge: '✨', unlockRewardText: 'Giant Sacred Baobab Sapling' },
  { level: 15, title: 'Eternal Rimba Warden', badge: '🌟', unlockRewardText: 'Ancient Elder Tree Sapling (Grandmaster)' },
  { level: 16, title: 'Frost Dew Keeper', badge: '❄️', unlockRewardText: 'Rocky Mountain Spruce Sapling' },
  { level: 17, title: 'Blizzard Calmer', badge: '🌨️', unlockRewardText: 'Alpine Frosted Boulder Trio' },
  { level: 18, title: 'Ice Peak Knight', badge: '🏔️', unlockRewardText: 'Young Snow Pine & Frosted Moss' },
  { level: 19, title: 'Eternal Glacier Elder', badge: '💎', unlockRewardText: 'Snowy Round Canopy & Crystal Cluster' },
  { level: 20, title: 'Eternal Snow Sovereign', badge: '👑', unlockRewardText: 'Winter Wonderland Biome & Eternal Snow Pine' },
];

export function getLevelMetadata(level: number, language?: 'id' | 'en'): LevelMetadata {
  const isEn = (language ?? usePreferencesStore.getState().language) === 'en';
  const clamped = Math.max(1, Math.min(MAX_DEFINED_LEVEL, level));
  const list = isEn ? LEVEL_METADATA_EN : LEVEL_METADATA;
  return list[clamped - 1] || list[0];
}

export interface LevelProgress {
  currentLevel: number;
  currentXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressRatio: number; // 0.0 to 1.0
  isMaxLevel: boolean;
  title: string;
  badge: string;
  unlockRewardText: string;
}

export function getLevelProgress(xp: number, language?: 'id' | 'en'): LevelProgress {
  const safeXp = Math.max(0, xp || 0);
  const currentLevel = getLevelFromXp(safeXp);
  const meta = getLevelMetadata(currentLevel, language);

  if (currentLevel >= MAX_DEFINED_LEVEL) {
    const levelFloor = LEVEL_THRESHOLDS[MAX_DEFINED_LEVEL - 1] + (currentLevel - MAX_DEFINED_LEVEL) * 2500;
    const xpInCurrentLevel = safeXp - levelFloor;
    const xpNeededForNextLevel = 2500;
    const progressRatio = Math.min(1, Math.max(0, xpInCurrentLevel / xpNeededForNextLevel));

    return {
      currentLevel,
      currentXp: safeXp,
      xpInCurrentLevel,
      xpNeededForNextLevel,
      progressRatio,
      isMaxLevel: true,
      title: meta.title,
      badge: meta.badge,
      unlockRewardText: meta.unlockRewardText,
    };
  }

  const levelFloor = LEVEL_THRESHOLDS[currentLevel - 1];
  const levelCeil = LEVEL_THRESHOLDS[currentLevel];
  const xpInCurrentLevel = safeXp - levelFloor;
  const xpNeededForNextLevel = levelCeil - levelFloor;
  const progressRatio = Math.min(1, Math.max(0, xpInCurrentLevel / xpNeededForNextLevel));

  return {
    currentLevel,
    currentXp: safeXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressRatio,
    isMaxLevel: false,
    title: meta.title,
    badge: meta.badge,
    unlockRewardText: meta.unlockRewardText,
  };
}
