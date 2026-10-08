/**
 * Level & XP Progression Rules for Rimba
 * Provides progressive scaling curves and helper functions across all 15 levels.
 */

// XP cumulative thresholds to reach each level (index 0 = Level 1 starts at 0 XP)
export const LEVEL_THRESHOLDS = [
  0,      // Level 1: 0 XP
  100,    // Level 2: 100 XP (+100 XP) ~1 sesi 25m
  250,    // Level 3: 250 XP (+150 XP) ~1.5 sesi
  470,    // Level 4: 470 XP (+220 XP) ~2 sesi
  770,    // Level 5: 770 XP (+300 XP) ~3 sesi
  1170,   // Level 6: 1,170 XP (+400 XP)
  1690,   // Level 7: 1,690 XP (+520 XP)
  2350,   // Level 8: 2,350 XP (+660 XP)
  3170,   // Level 9: 3,170 XP (+820 XP)
  4170,   // Level 10: 4,170 XP (+1,000 XP)
  5370,   // Level 11: 5,370 XP (+1,200 XP)
  6790,   // Level 12: 6,790 XP (+1,420 XP)
  8450,   // Level 13: 8,450 XP (+1,660 XP)
  10370,  // Level 14: 10,370 XP (+1,920 XP)
  12570,  // Level 15: 12,570 XP (+2,200 XP) - Grand Master
];

export const MAX_DEFINED_LEVEL = 15;

/**
 * Calculates current level from total XP using the progressive threshold curve.
 */
export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp || 0);

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      // If beyond max defined level, progress every 2,500 XP
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
];

export function getLevelMetadata(level: number): LevelMetadata {
  const clamped = Math.max(1, Math.min(15, level));
  return LEVEL_METADATA[clamped - 1] || LEVEL_METADATA[0];
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

/**
 * Returns detailed progress information for level bars, badges, and profile modals.
 */
export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp || 0);
  const currentLevel = getLevelFromXp(safeXp);
  const meta = getLevelMetadata(currentLevel);

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
