import { AnalyticsSummary } from './analytics';
import { RimbaSaveData } from '@/types/game';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  rangerName: string;
  avatarEmoji: string;
  title: string;
  totalFocusMinutes: number;
  treesCount: number;
  streakDays: number;
  karmaReceived: number;
  isCurrentUser?: boolean;
  countryBadge: string;
  primaryTag: string;
}

export interface RangerTier {
  id: string;
  tierRank: number;
  name: string;
  minMinutes: number;
  minTrees: number;
  badgeEmoji: string;
  description: string;
}

export const RANGER_HALL_OF_FAME_TIERS: RangerTier[] = [
  {
    id: 'tier_maharaja',
    tierRank: 1,
    name: 'Maharaja Rimba',
    minMinutes: 3000,
    minTrees: 50,
    badgeEmoji: '👑',
    description: 'Tingkat tertinggi suaka: melampaui 50 jam deep work penuh kesadaran.',
  },
  {
    id: 'tier_baobab',
    tierRank: 2,
    name: 'Pelindung Baobab Purba',
    minMinutes: 2000,
    minTrees: 35,
    badgeEmoji: '🌳',
    description: 'Menjaga pohon-pohon raksasa dan kanopi suaka purba.',
  },
  {
    id: 'tier_pinus',
    tierRank: 3,
    name: 'Ksatria Pinus Pegunungan',
    minMinutes: 1000,
    minTrees: 20,
    badgeEmoji: '🌲',
    description: 'Fokus setegar pinus di lereng pegunungan tinggi.',
  },
  {
    id: 'tier_lembah',
    tierRank: 4,
    name: 'Penjaga Lembah Sungai',
    minMinutes: 500,
    minTrees: 10,
    badgeEmoji: '🏞️',
    description: 'Merawat aliran air dan kesuburan tanah suaka.',
  },
  {
    id: 'tier_kanopi',
    tierRank: 5,
    name: 'Pengembara Kanopi Rimba',
    minMinutes: 250,
    minTrees: 5,
    badgeEmoji: '🌿',
    description: 'Menapaki dedaunan rimbun dan ritme konsistensi harian.',
  },
  {
    id: 'tier_kabut',
    tierRank: 6,
    name: 'Penjaga Kabut Hening',
    minMinutes: 100,
    minTrees: 2,
    badgeEmoji: '🌫️',
    description: 'Melatih keheningan pikiran di awal fajar.',
  },
  {
    id: 'tier_tunas',
    tierRank: 7,
    name: 'Tunas Rimba Baru',
    minMinutes: 0,
    minTrees: 0,
    badgeEmoji: '🌱',
    description: 'Langkah pertama menanam benih fokus dan mindfulness.',
  },
];

export function getCurrentRangerTier(totalMinutes: number, treeCount: number): RangerTier {
  for (const tier of RANGER_HALL_OF_FAME_TIERS) {
    if (totalMinutes >= tier.minMinutes && treeCount >= tier.minTrees) {
      return tier;
    }
  }
  return RANGER_HALL_OF_FAME_TIERS[RANGER_HALL_OF_FAME_TIERS.length - 1];
}

/**
 * Generates leaderboard entries based strictly on actual player achievements.
 * Zero fake bot accounts or synthetic data.
 */
export function generateLeaderboard(
  saveData: RimbaSaveData,
  analytics: AnalyticsSummary,
  _sortBy: 'focus' | 'streak' | 'trees' = 'focus'
): LeaderboardEntry[] {
  const activeTrees = (saveData.world_objects || []).filter(
    (o) => o.object_type === 'tree' && o.status === 'active'
  ).length;

  const tier = getCurrentRangerTier(analytics.totalFocusMinutes, activeTrees);

  const userEntry: LeaderboardEntry = {
    rank: 1,
    id: 'user_current',
    rangerName: saveData.profile?.name || saveData.world?.name || 'Ranger Rimba',
    avatarEmoji: tier.badgeEmoji,
    title: tier.name,
    totalFocusMinutes: analytics.totalFocusMinutes,
    treesCount: activeTrees,
    streakDays: analytics.currentStreak,
    karmaReceived: (saveData.currency_ledger || []).length,
    isCurrentUser: true,
    countryBadge: '🇮🇩',
    primaryTag: 'Fokus',
  };

  return [userEntry];
}
