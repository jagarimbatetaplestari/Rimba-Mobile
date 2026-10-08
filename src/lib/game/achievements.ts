import { RimbaSaveData, WorldObject } from '@/types/game';
import { calculateAnalytics } from './analytics';
import { calculateBalances, createLedgerEntry } from './economy';
import { getUnlockedTilesSet } from './worldRules';

export interface AchievementConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: 'focus' | 'nature' | 'world' | 'fauna';
  targetValue: number;
  reward: {
    gold: number;
    xp: number;
  };
  description: string;
  quote: string;
}

export interface AchievementProgress {
  id: string;
  config: AchievementConfig;
  currentValue: number;
  targetValue: number;
  percent: number;
  isUnlocked: boolean;
  isClaimed: boolean;
}

export const ACHIEVEMENTS_LIST: AchievementConfig[] = [
  {
    id: 'ach_first_focus',
    title: 'Langkah Mula',
    subtitle: 'Menanam Benih Kesadaran',
    icon: '🌱',
    category: 'focus',
    targetValue: 1,
    reward: { gold: 25, xp: 50 },
    description: 'Selesaikan 1 sesi fokus pertama dan tumbuhkan pohon perdanamu di pulau Rimba.',
    quote: 'Perjalanan seribu mil bermula dari satu tarikan napas dan satu langkah awal.',
  },
  {
    id: 'ach_tree_variety',
    title: 'Penyelaras Alam',
    subtitle: 'Keanekaragaman Hayati',
    icon: '🌳',
    category: 'nature',
    targetValue: 3,
    reward: { gold: 30, xp: 60 },
    description: 'Tumbuhkan minimal 3 spesies pohon berbeda (misal: Oak, Pine, Autumn, Palm, Ancient).',
    quote: 'Hutan yang tangguh adalah hutan yang merangkul keberagaman bentuk kehidupan.',
  },
  {
    id: 'ach_night_owl',
    title: 'Penjaga Malam',
    subtitle: 'Ketenangan Bawah Rembulan',
    icon: '🌙',
    category: 'focus',
    targetValue: 1,
    reward: { gold: 30, xp: 60 },
    description: 'Selesaikan sesi fokus saat malam hari di bawah naungan bintang dan kunang-kunang.',
    quote: 'Dalam keheningan malam, jiwa yang tekun menemukan kejernihan tanpa batas.',
  },
  {
    id: 'ach_streak_3',
    title: 'Tunas Rimba',
    subtitle: 'Ritme Habit 3 Hari',
    icon: '🔥',
    category: 'focus',
    targetValue: 3,
    reward: { gold: 35, xp: 70 },
    description: 'Pertahankan rantai fokus (daily streak) selama 3 hari berturut-turut.',
    quote: 'Tiga hari berturut-turut adalah fondasi terbentuknya kebiasaan sejati.',
  },
  {
    id: 'ach_streak_7',
    title: 'Penjaga Hutan',
    subtitle: 'Keteguhan Hati 7 Hari',
    icon: '⚡',
    category: 'focus',
    targetValue: 7,
    reward: { gold: 50, xp: 100 },
    description: 'Pertahankan rantai fokus penuh selama 7 hari berturut-turut.',
    quote: 'Akar yang mencengkeram bumi dalam tujuh purnama takkan goyah oleh hembusan badai.',
  },
  {
    id: 'ach_land_expand',
    title: 'Arsitek Kepulauan',
    subtitle: 'Perluas Wilayah 14 Petak',
    icon: '🗺️',
    category: 'world',
    targetValue: 14,
    reward: { gold: 40, xp: 80 },
    description: 'Perluas pulau mengambang hingga memiliki minimal 14 petak hijau terbuka.',
    quote: 'Setiap petak baru adalah ruang tumbuh bagi ketenangan yang kian lapang.',
  },
  {
    id: 'ach_fauna_whisperer',
    title: 'Sahabat Satwa',
    subtitle: 'Menyapa 3 Spesies Satwa',
    icon: '🐾',
    category: 'fauna',
    targetValue: 3,
    reward: { gold: 35, xp: 70 },
    description: 'Temukan dan sapa minimal 3 spesies satwa liar yang berbeda di pulau Rimba.',
    quote: 'Kehangatan hati terasa saat satwa liar menyambutmu tanpa rasa takut.',
  },
  {
    id: 'ach_bulldozer_hero',
    title: 'Penyelamat Rimba',
    subtitle: 'Mengatasi Ancaman Buldozer',
    icon: '🛡️',
    category: 'world',
    targetValue: 1,
    reward: { gold: 40, xp: 80 },
    description: 'Pukul mundur buldozer reklamasi melalui sesi fokus pemulihan atau perisai energi Soul.',
    quote: 'Kemunduran adalah kesempatan untuk bangkit kembali dengan keteguhan baru.',
  },
  {
    id: 'ach_focus_180',
    title: 'Master Fokus',
    subtitle: 'Akumulasi 180 Menit Fokus',
    icon: '⏳',
    category: 'focus',
    targetValue: 180,
    reward: { gold: 50, xp: 100 },
    description: 'Kumpulkan total 180 menit fokus mindful yang tercatat dalam sejarah pulau.',
    quote: 'Waktu yang diinvestasikan pada hal bermakna akan berbuah ketenangan abadi.',
  },
];

/**
 * Evaluates progress and completion status for all achievements.
 */
export function evaluateAchievements(saveData: RimbaSaveData): {
  items: AchievementProgress[];
  unclaimedCount: number;
  completedCount: number;
  totalCount: number;
} {
  const claimedSet = new Set(saveData.claimed_achievements || []);
  const worldObjects = saveData.world_objects || [];
  const sessions = (saveData.focus_sessions || []).filter((s) => s.status === 'completed');
  const unlockedTiles = getUnlockedTilesSet(saveData.world, worldObjects);
  const analytics = calculateAnalytics(saveData.focus_sessions);

  // 1. Total Completed Focus Sessions
  const totalCompletedSessions = sessions.length;

  // 2. Distinct tree species planted on island
  const activeTrees = worldObjects.filter(
    (o) => o.object_type === 'tree' && o.status === 'active'
  );
  const distinctSpecies = new Set(activeTrees.map((t) => t.species || 'oak')).size;

  // 3. Night sessions
  const nightSessionsCount = sessions.filter((s) => {
    try {
      const date = new Date(s.started_at);
      const hours = date.getHours() + date.getMinutes() / 60;
      return hours >= 18.5 || hours < 5.5;
    } catch {
      return false;
    }
  }).length;

  // 4 & 5. Streaks
  const maxStreak = Math.max(analytics.currentStreak, analytics.longestStreak);

  // 6. Unlocked Tiles
  const unlockedCount = unlockedTiles.size;

  // 7. Distinct fauna species greeted
  const greetedSpeciesCount = Object.keys(saveData.animal_interactions || {}).length;

  // 8. Bulldozer resolved
  const bulldozerHeroResolved = saveData.currency_ledger.some(
    (e) =>
      e.reason.includes('bribe') ||
      e.reason.includes('bulldozer_dismiss') ||
      e.reason.includes('focus_restore')
  )
    ? 1
    : 0;

  // 9. Total Focus Minutes
  const totalFocusMinutes = sessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 25),
    0
  );

  let unclaimedCount = 0;
  let completedCount = 0;

  const items: AchievementProgress[] = ACHIEVEMENTS_LIST.map((config) => {
    let currentValue = 0;

    switch (config.id) {
      case 'ach_first_focus':
        currentValue = totalCompletedSessions;
        break;
      case 'ach_tree_variety':
        currentValue = distinctSpecies;
        break;
      case 'ach_night_owl':
        currentValue = nightSessionsCount;
        break;
      case 'ach_streak_3':
        currentValue = maxStreak;
        break;
      case 'ach_streak_7':
        currentValue = maxStreak;
        break;
      case 'ach_land_expand':
        currentValue = unlockedCount;
        break;
      case 'ach_fauna_whisperer':
        currentValue = greetedSpeciesCount;
        break;
      case 'ach_bulldozer_hero':
        currentValue = bulldozerHeroResolved;
        break;
      case 'ach_focus_180':
        currentValue = totalFocusMinutes;
        break;
      default:
        currentValue = 0;
    }

    const isUnlocked = currentValue >= config.targetValue;
    const isClaimed = claimedSet.has(config.id);

    if (isUnlocked) {
      completedCount++;
      if (!isClaimed) {
        unclaimedCount++;
      }
    }

    const percent = Math.min(100, Math.round((currentValue / config.targetValue) * 100));

    return {
      id: config.id,
      config,
      currentValue,
      targetValue: config.targetValue,
      percent,
      isUnlocked,
      isClaimed,
    };
  });

  return {
    items,
    unclaimedCount,
    completedCount,
    totalCount: ACHIEVEMENTS_LIST.length,
  };
}

export interface ClaimAchievementResult {
  ok: boolean;
  message: string;
  goldEarned: number;
  xpEarned: number;
  updatedSaveData: RimbaSaveData;
}

/**
 * Claims the reward for a completed achievement.
 */
export function claimAchievementReward(
  achievementId: string,
  saveData: RimbaSaveData
): ClaimAchievementResult {
  const config = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
  if (!config) {
    return {
      ok: false,
      message: 'Prestasi tidak ditemukan.',
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  const claimedSet = new Set(saveData.claimed_achievements || []);
  if (claimedSet.has(achievementId)) {
    return {
      ok: false,
      message: 'Hadiah prestasi ini sudah pernah diklaim!',
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  const evaluation = evaluateAchievements(saveData);
  const targetItem = evaluation.items.find((item) => item.id === achievementId);
  if (!targetItem || !targetItem.isUnlocked) {
    return {
      ok: false,
      message: `Syarat prestasi '${config.title}' belum tercapai (${targetItem?.currentValue || 0}/${config.targetValue}).`,
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  // Create ledger entries for reward
  const goldEntry = createLedgerEntry(
    'gold',
    config.reward.gold,
    `achievement_claim_${achievementId}`,
    `ach_${achievementId}`
  );
  const xpEntry = createLedgerEntry(
    'xp',
    config.reward.xp,
    `achievement_claim_${achievementId}`,
    `ach_${achievementId}`
  );

  const updatedLedger = [...saveData.currency_ledger, goldEntry, xpEntry];
  const { gold, xp } = calculateBalances(updatedLedger);

  const updatedClaimed = [...(saveData.claimed_achievements || []), achievementId];

  const updatedSaveData: RimbaSaveData = {
    ...saveData,
    profile: {
      ...saveData.profile,
      goldCached: gold,
      xp,
    },
    currency_ledger: updatedLedger,
    claimed_achievements: updatedClaimed,
  };

  return {
    ok: true,
    message: `Lencana '${config.title}' berhasil diraih! +${config.reward.gold} Soul, +${config.reward.xp} XP.`,
    goldEarned: config.reward.gold,
    xpEarned: config.reward.xp,
    updatedSaveData,
  };
}
