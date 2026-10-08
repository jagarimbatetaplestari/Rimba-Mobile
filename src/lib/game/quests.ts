import { CurrencyLedgerEntry, DailyQuestId, RimbaSaveData } from '@/types/game';
import { toLocalDateString } from './analytics';
import { createLedgerEntry } from './economy';

export interface DailyQuestDefinition {
  id: DailyQuestId;
  icon: string; // Line icon key: Sprout, Clock, Compass, Layers, Heart, Sun, Moon, Target
  title: string;
  description: string;
  target: number;
  unit: string;
  rewardGold: number;
  rewardXp: number;
}

export interface DailyQuestProgress extends DailyQuestDefinition {
  current: number;
  isCompleted: boolean;
  isClaimed: boolean;
  claimKey: string;
}

export interface DailyQuestStatusSummary {
  dateStr: string;
  quests: DailyQuestProgress[];
  allCompleted: boolean;
  allQuestsClaimed: boolean;
  allClearClaimed: boolean;
  allClearClaimKey: string;
  allClearRewardGold: number;
  allClearRewardXp: number;
  claimableCount: number; // Number of rewards ready to be claimed right now
}

export const ALL_DAILY_QUEST_POOL: DailyQuestDefinition[] = [
  {
    id: 'q_focus_1',
    icon: 'Sprout',
    title: 'Langkah Fokus Pertama',
    description: 'Selesaikan minimal 1 sesi fokus hari ini untuk menumbuhkan pohon.',
    target: 1,
    unit: 'sesi',
    rewardGold: 15,
    rewardXp: 30,
  },
  {
    id: 'q_minutes_45',
    icon: 'Clock',
    title: 'Dedikasi Mendalam',
    description: 'Kumpulkan akumulasi waktu fokus minimal 45 menit hari ini.',
    target: 45,
    unit: 'menit',
    rewardGold: 25,
    rewardXp: 50,
  },
  {
    id: 'q_flow_30',
    icon: 'Compass',
    title: 'Keheningan Mengalir',
    description: 'Selesaikan 1 sesi fokus tanpa jeda berdurasi minimal 30 menit.',
    target: 1,
    unit: 'sesi',
    rewardGold: 20,
    rewardXp: 40,
  },
  {
    id: 'q_builder_1',
    icon: 'Layers',
    title: 'Penata Suaka Rimba',
    description: 'Tanam pohon, hias pulau, atau perluas 1 petak lahan hari ini.',
    target: 1,
    unit: 'aksi',
    rewardGold: 20,
    rewardXp: 40,
  },
  {
    id: 'q_fauna_friend',
    icon: 'Heart',
    title: 'Sapaan Hangat Satwa',
    description: 'Sapa satwa liar yang sedang berkunjung di suaka pulaumu hari ini.',
    target: 1,
    unit: 'sapaan',
    rewardGold: 15,
    rewardXp: 30,
  },
  {
    id: 'q_dawn_focus',
    icon: 'Sun',
    title: 'Embun Pagi Fokus',
    description: 'Selesaikan 1 sesi fokus di waktu pagi hingga siang hari.',
    target: 1,
    unit: 'sesi',
    rewardGold: 20,
    rewardXp: 40,
  },
  {
    id: 'q_evening_calm',
    icon: 'Moon',
    title: 'Hening Senja & Malam',
    description: 'Selesaikan 1 sesi fokus di waktu senja atau malam hari.',
    target: 1,
    unit: 'sesi',
    rewardGold: 20,
    rewardXp: 40,
  },
  {
    id: 'q_tag_explorer',
    icon: 'Target',
    title: 'Eksplorasi Niat',
    description: 'Gunakan minimal 2 kategori atau tag fokus berbeda hari ini.',
    target: 2,
    unit: 'kategori',
    rewardGold: 25,
    rewardXp: 50,
  },
];

export const ALL_CLEAR_BONUS_CONFIG = {
  id: 'q_all_clear',
  icon: 'Sparkles',
  title: 'Peti Sapu Bersih Harian',
  description: 'Klaim ketiga misi harian hari ini untuk membuka bonus berkah penjaga hutan!',
  rewardGold: 30,
  rewardXp: 60,
};

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns deterministic set of 3 daily quests for a given date.
 * Always includes q_focus_1 as primary pillar, and rotates 2 others from the pool.
 */
export function getDailyQuestDefinitionsForDate(dateStr: string): DailyQuestDefinition[] {
  const rotatingPool = ALL_DAILY_QUEST_POOL.filter((q) => q.id !== 'q_focus_1');
  const seed = hashStringToNumber(dateStr);

  const firstIndex = seed % rotatingPool.length;
  const remaining = rotatingPool.filter((_, idx) => idx !== firstIndex);
  const secondIndex = (seed + 3) % remaining.length;

  const coreQuest = ALL_DAILY_QUEST_POOL.find((q) => q.id === 'q_focus_1')!;
  return [coreQuest, rotatingPool[firstIndex], remaining[secondIndex]];
}

/**
 * Deterministically evaluates today's quest progress and claim status from saveData.
 */
export function getDailyQuestStatus(
  saveData: RimbaSaveData,
  dateStr: string = toLocalDateString(new Date())
): DailyQuestStatusSummary {
  const claimedSet = new Set(saveData.claimed_quests || []);

  // Check ledger reference_ids for idempotency
  for (const entry of saveData.currency_ledger) {
    if (entry.reference_id && entry.reference_id.startsWith(`${dateStr}:q_`)) {
      claimedSet.add(entry.reference_id);
    }
  }

  // 1. Sessions completed on dateStr
  const completedToday = saveData.focus_sessions.filter((s) => {
    if (s.status !== 'completed' || !s.completed_at) return false;
    return toLocalDateString(new Date(s.completed_at)) === dateStr;
  });

  const sessionCountToday = completedToday.length;
  const focusMinutesToday = completedToday.reduce((sum, s) => {
    if (typeof s.duration_minutes === 'number' && s.duration_minutes > 0) {
      return sum + s.duration_minutes;
    }
    const start = new Date(s.started_at).getTime();
    const end = new Date(s.expected_end_at).getTime();
    return sum + Math.max(1, Math.round((end - start) / 60000));
  }, 0);

  // 2. Flow sessions (>= 30 mins)
  const flowSessionsToday = completedToday.filter((s) => {
    const mins =
      typeof s.duration_minutes === 'number' && s.duration_minutes > 0
        ? s.duration_minutes
        : Math.round(
            (new Date(s.expected_end_at).getTime() - new Date(s.started_at).getTime()) / 60000
          );
    return mins >= 30;
  }).length;

  // 3. Builder / Island actions on dateStr
  const objectsCreatedToday = saveData.world_objects.filter((obj) => {
    if (!obj.created_at) return false;
    return toLocalDateString(new Date(obj.created_at)) === dateStr;
  }).length;

  const builderLedgerActionsToday = saveData.currency_ledger.filter((entry) => {
    if (!entry.created_at) return false;
    const isToday = toLocalDateString(new Date(entry.created_at)) === dateStr;
    if (!isToday) return false;
    return (
      entry.reason === 'expand_land_tile' ||
      entry.reason.startsWith('place_') ||
      entry.reason.startsWith('build_') ||
      entry.reason === 'focus_session_completed'
    );
  }).length;

  const builderCountToday = Math.max(objectsCreatedToday, builderLedgerActionsToday);

  // 4. Animal interaction today
  const animalInteractions = saveData.animal_interactions || {};
  const animalsGreetedToday = Object.values(animalInteractions).filter(
    (greetDate) => greetDate === dateStr
  ).length;

  // 5. Day / Night sessions
  const dawnSessionsToday = completedToday.filter((s) => {
    const d = new Date(s.completed_at!);
    const hours = d.getHours() + d.getMinutes() / 60;
    return hours >= 6 && hours < 16.5;
  }).length;

  const eveningSessionsToday = completedToday.filter((s) => {
    const d = new Date(s.completed_at!);
    const hours = d.getHours() + d.getMinutes() / 60;
    return hours >= 16.5 || hours < 6;
  }).length;

  // 6. Distinct tags used today
  const distinctTagsToday = new Set(
    completedToday.map((s) => s.tag || 'Belajar')
  ).size;

  const todayDefs = getDailyQuestDefinitionsForDate(dateStr);

  const quests: DailyQuestProgress[] = todayDefs.map((def) => {
    let rawCurrent = 0;
    switch (def.id) {
      case 'q_focus_1':
        rawCurrent = sessionCountToday;
        break;
      case 'q_minutes_45':
        rawCurrent = focusMinutesToday;
        break;
      case 'q_flow_30':
        rawCurrent = flowSessionsToday;
        break;
      case 'q_builder_1':
        rawCurrent = builderCountToday;
        break;
      case 'q_fauna_friend':
        rawCurrent = animalsGreetedToday;
        break;
      case 'q_dawn_focus':
        rawCurrent = dawnSessionsToday;
        break;
      case 'q_evening_calm':
        rawCurrent = eveningSessionsToday;
        break;
      case 'q_tag_explorer':
        rawCurrent = distinctTagsToday;
        break;
      default:
        rawCurrent = sessionCountToday;
        break;
    }

    const current = Math.min(def.target, rawCurrent);
    const isCompleted = current >= def.target;
    const claimKey = `${dateStr}:${def.id}`;
    const isClaimed = claimedSet.has(claimKey);

    return {
      ...def,
      current,
      isCompleted,
      isClaimed,
      claimKey,
    };
  });

  const allCompleted = quests.every((q) => q.isCompleted);
  const allQuestsClaimed = quests.every((q) => q.isClaimed);
  const allClearClaimKey = `${dateStr}:${ALL_CLEAR_BONUS_CONFIG.id}`;
  const allClearClaimed = claimedSet.has(allClearClaimKey);

  let claimableCount = quests.filter((q) => q.isCompleted && !q.isClaimed).length;
  if (allQuestsClaimed && !allClearClaimed) {
    claimableCount += 1;
  }

  return {
    dateStr,
    quests,
    allCompleted,
    allQuestsClaimed,
    allClearClaimed,
    allClearClaimKey,
    allClearRewardGold: ALL_CLEAR_BONUS_CONFIG.rewardGold,
    allClearRewardXp: ALL_CLEAR_BONUS_CONFIG.rewardXp,
    claimableCount,
  };
}

export interface ClaimQuestResult {
  success: boolean;
  error?: string;
  claimKey?: string;
  newLedgerEntries: CurrencyLedgerEntry[];
  rewardGold: number;
  rewardXp: number;
}

/**
 * Claims an individual completed daily quest idempotently.
 */
export function claimDailyQuest(
  saveData: RimbaSaveData,
  questId: string,
  dateStr: string = toLocalDateString(new Date())
): ClaimQuestResult {
  const status = getDailyQuestStatus(saveData, dateStr);
  const quest = status.quests.find((q) => q.id === questId);

  if (!quest) {
    return {
      success: false,
      error: 'Misi tidak ditemukan.',
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  if (!quest.isCompleted) {
    return {
      success: false,
      error: 'Syarat misi belum terpenuhi.',
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  if (quest.isClaimed) {
    return {
      success: false,
      error: 'Hadiah misi ini sudah diklaim.',
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  const goldEntry = createLedgerEntry(
    'gold',
    quest.rewardGold,
    'daily_quest_reward',
    quest.claimKey
  );
  const xpEntry = createLedgerEntry(
    'xp',
    quest.rewardXp,
    'daily_quest_reward',
    quest.claimKey
  );

  return {
    success: true,
    claimKey: quest.claimKey,
    newLedgerEntries: [goldEntry, xpEntry],
    rewardGold: quest.rewardGold,
    rewardXp: quest.rewardXp,
  };
}

/**
 * Claims the All-Clear Daily Bonus Chest once all 3 daily quests are claimed.
 */
export function claimAllClearDailyBonus(
  saveData: RimbaSaveData,
  dateStr: string = toLocalDateString(new Date())
): ClaimQuestResult {
  const status = getDailyQuestStatus(saveData, dateStr);

  if (!status.allQuestsClaimed) {
    return {
      success: false,
      error: 'Klaim ketiga misi harian terlebih dahulu untuk membuka peti ini!',
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  if (status.allClearClaimed) {
    return {
      success: false,
      error: 'Peti Sapu Bersih hari ini sudah diklaim.',
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  const goldEntry = createLedgerEntry(
    'gold',
    status.allClearRewardGold,
    'daily_all_clear_bonus',
    status.allClearClaimKey
  );
  const xpEntry = createLedgerEntry(
    'xp',
    status.allClearRewardXp,
    'daily_all_clear_bonus',
    status.allClearClaimKey
  );

  return {
    success: true,
    claimKey: status.allClearClaimKey,
    newLedgerEntries: [goldEntry, xpEntry],
    rewardGold: status.allClearRewardGold,
    rewardXp: status.allClearRewardXp,
  };
}
