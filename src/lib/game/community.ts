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
  perk: string;
  color: string;
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
    perk: 'Gelar Kehormatan Suaka Abadi & Bibit Pohon Leluhur Kuno',
    color: '#F59E0B',
  },
  {
    id: 'tier_baobab',
    tierRank: 2,
    name: 'Pelindung Baobab Purba',
    minMinutes: 2000,
    minTrees: 35,
    badgeEmoji: '🌳',
    description: 'Menjaga pohon raksasa penampung energi suaka purba.',
    perk: 'Aura Ketenangan Abadi & Bibit Baobab Sakral Raksasa',
    color: '#D97706',
  },
  {
    id: 'tier_pinus',
    tierRank: 3,
    name: 'Ksatria Pinus Pegunungan',
    minMinutes: 1000,
    minTrees: 20,
    badgeEmoji: '🌲',
    description: 'Fokus setegar pinus di lereng pegunungan tinggi nan tenang.',
    perk: 'Perlindungan otomatis Streak Shield & Bibit Pinus Bertingkat',
    color: '#047857',
  },
  {
    id: 'tier_lembah',
    tierRank: 4,
    name: 'Penjaga Lembah Sungai',
    minMinutes: 500,
    minTrees: 10,
    badgeEmoji: '🏞️',
    description: 'Merawat aliran air sungai dan kesuburan tanah suaka.',
    perk: 'Membuka Jembatan Kayu Rustik & Penataan Aliran Sungai Penuh',
    color: '#0284C7',
  },
  {
    id: 'tier_kanopi',
    tierRank: 5,
    name: 'Pengembara Kanopi Rimba',
    minMinutes: 250,
    minTrees: 5,
    badgeEmoji: '🌿',
    description: 'Menapaki dedaunan rimbun dan ritme deep work harian.',
    perk: 'Membuka Satwa Rusa Mistis Malam Hari & Bibit Cemara Nordik',
    color: '#059669',
  },
  {
    id: 'tier_kabut',
    tierRank: 6,
    name: 'Penjaga Kabut Hening',
    minMinutes: 100,
    minTrees: 2,
    badgeEmoji: '🌫️',
    description: 'Melatih keheningan pikiran dan konsistensi di awal fajar.',
    perk: 'Membuka Flora Semak Belukar Rapi & Bonus Sapaan Satwa Harian',
    color: '#14B8A6',
  },
  {
    id: 'tier_tunas',
    tierRank: 7,
    name: 'Tunas Rimba Baru',
    minMinutes: 0,
    minTrees: 0,
    badgeEmoji: '🌱',
    description: 'Langkah pertama menanam benih fokus dan mindfulness.',
    perk: 'Akses Dasar Suaka 3×3 & Bibit Pohon Oak Rimba',
    color: '#10B981',
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

export function getNextRangerTier(currentTier: RangerTier): RangerTier | null {
  const currentIdx = RANGER_HALL_OF_FAME_TIERS.findIndex((t) => t.id === currentTier.id);
  if (currentIdx > 0) {
    return RANGER_HALL_OF_FAME_TIERS[currentIdx - 1];
  }
  return null;
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
