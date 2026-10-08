import { FaunaConfig, FaunaSpecies, RimbaSaveData, TimeOfDay, WorldObject } from '@/types/game';
import { calculateAnalytics, toLocalDateString } from './analytics';
import { calculateBalances, createLedgerEntry } from './economy';
import { getUnlockedTilesSet } from './worldRules';

export const FAUNA_CONFIG: Record<FaunaSpecies, FaunaConfig> = {
  bee: {
    id: 'bee',
    name: 'Lebah Madu',
    title: 'Penyelaras Bunga',
    icon: '🐝',
    description: 'Lebah madu pekerja keras yang berdengung riang mengumpulkan nektar manis dari kelopak bunga.',
    unlockConditionText: 'Miliki minimal 1 bunga atau semak hijau di pulau.',
    greetingQuote: 'Dengungan lembutnya membawa aroma madu manis yang menenangkan.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  butterfly: {
    id: 'butterfly',
    name: 'Lebah Madu',
    title: 'Penyelaras Bunga',
    icon: '🐝',
    description: 'Lebah madu pekerja keras yang berdengung riang mengumpulkan nektar manis dari kelopak bunga.',
    unlockConditionText: 'Miliki minimal 1 bunga atau semak hijau di pulau.',
    greetingQuote: 'Dengungan lembutnya membawa aroma madu manis yang menenangkan.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  bird: {
    id: 'bird',
    name: 'Burung Kicau Rimba',
    title: 'Penjaga Tajuk Hutan',
    icon: '🐦',
    description: 'Burung montok berbulu cerah yang bertengger di dahan rindang dan menyanyikan simfoni ketenangan.',
    unlockConditionText: 'Tanam minimal 2 pohon dewasa di pulau.',
    greetingQuote: 'Kicauan merdunya membuat pikiranmu jernih dan bersemangat.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  rabbit: {
    id: 'rabbit',
    name: 'Kelinci Padang Rumput',
    title: 'Penjelajah Teritori',
    icon: '🐇',
    description: 'Kelinci lincah dengan telinga panjang yang suka melompat santai di bentangan rumput luas.',
    unlockConditionText: 'Buka luas wilayah pulau hingga minimal 12 petak.',
    greetingQuote: 'Hidungnya berkedut ramah saat kamu mengelus bulu halusnya.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  fox: {
    id: 'fox',
    name: 'Rubah Rimba',
    title: 'Pengelana Rimba Rindang',
    icon: '🦊',
    description: 'Rubah cerdas berbulu lebat hangat yang suka mengamati pulau dari balik bayang-bayang pepohonan.',
    unlockConditionText: 'Tanam minimal 3 pohon dan perluas pulau hingga 14 petak.',
    greetingQuote: 'Ekor lebatnya bergoyang anggun mengisyaratkan kehangatan hutan.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  koala: {
    id: 'koala',
    name: 'Koala Pohon',
    title: 'Penenang Dahan',
    icon: '🐨',
    description: 'Koala santai yang gemar memeluk batang pohon tinggi sambil menikmati sepoi angin sejuk.',
    unlockConditionText: 'Tanam pohon berdaun lebat (Oak/Ancient) atau capai Level 3.',
    greetingQuote: 'Matanya yang mengantuk memancarkan ketentraman hidup yang seimbang.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
  mystic_stag: {
    id: 'mystic_stag',
    name: 'Rusa Mistis Rimba',
    title: 'Pelindung Jiwa Tenang',
    icon: '🦌',
    description: 'Rusa agung dengan tanduk berpendarkan cahaya zamrud, menampakkan diri pada jiwa yang tekun atau di bawah naungan rembulan.',
    unlockConditionText: 'Pertahankan streak fokus minimal 3 hari beruntun ATAU hadir di malam hari.',
    greetingQuote: 'Pancaran ketenangannya menyelimuti seluruh sudut hatimu.',
    dailyReward: {
      gold: 5,
      xp: 15,
    },
  },
};

export const ALL_FAUNA_SPECIES: FaunaSpecies[] = [
  'bee',
  'bird',
  'rabbit',
  'fox',
  'koala',
  'mystic_stag',
];

/**
 * Checks if a world object is a flower, bush, or shrub that attracts pollinators.
 */
export function isFlowerOrBush(obj: WorldObject): boolean {
  if (obj.status !== 'active') return false;
  const variant = obj.model_variant || '';
  return (
    variant.includes('flower') ||
    variant.includes('bush') ||
    variant.includes('plant') ||
    variant.includes('mushroom') ||
    variant.includes('shroom') ||
    variant.includes('cactus')
  );
}

/**
 * Counts mature active trees on the island.
 */
export function countMatureTrees(worldObjects: WorldObject[]): number {
  return worldObjects.filter(
    (obj) => obj.object_type === 'tree' && obj.status === 'active'
  ).length;
}

/**
 * Checks whether a specific fauna species is eligible to appear on the island.
 */
export function checkFaunaEligibility(
  species: FaunaSpecies,
  saveData: RimbaSaveData,
  timeOfDay: TimeOfDay = 'day',
  targetDateStr?: string
): boolean {
  const worldObjects = saveData.world_objects || [];

  switch (species) {
    case 'bee':
    case 'butterfly': {
      // Requires at least 1 flower, shrub, or bush
      return worldObjects.some((obj) => isFlowerOrBush(obj));
    }

    case 'bird': {
      // Requires at least 2 active trees
      return countMatureTrees(worldObjects) >= 2;
    }

    case 'rabbit': {
      // Requires at least 12 unlocked tiles
      const unlockedSet = getUnlockedTilesSet(saveData.world, worldObjects);
      return unlockedSet.size >= 12;
    }

    case 'fox': {
      // Requires at least 3 active trees AND at least 14 unlocked tiles
      const treeCount = countMatureTrees(worldObjects);
      const unlockedSet = getUnlockedTilesSet(saveData.world, worldObjects);
      return treeCount >= 3 && unlockedSet.size >= 14;
    }

    case 'koala': {
      // Requires a mature dense tree (ancient/oak/baobab/savannah) OR player level >= 3
      const hasDenseTree = worldObjects.some(
        (obj) =>
          obj.object_type === 'tree' &&
          obj.status === 'active' &&
          (obj.species === 'ancient' ||
            obj.species === 'oak' ||
            (obj.model_variant || '').includes('oak') ||
            (obj.model_variant || '').includes('detailed') ||
            (obj.model_variant || '').includes('baobab') ||
            (obj.model_variant || '').includes('savannah'))
      );
      const playerLevel = Math.floor((saveData.profile.xp || 0) / 100) + 1;
      return hasDenseTree || playerLevel >= 3;
    }

    case 'mystic_stag': {
      // Requires streak >= 3 OR night time
      if (timeOfDay === 'night') return true;
      const refDate = targetDateStr ? new Date(targetDateStr) : new Date();
      const analytics = calculateAnalytics(saveData.focus_sessions, refDate);
      return analytics.currentStreak >= 3;
    }

    default:
      return false;
  }
}

/**
 * Retrieves the list of all active fauna species on the island right now.
 */
export function getActiveFaunaList(
  saveData: RimbaSaveData,
  timeOfDay: TimeOfDay = 'day',
  targetDateStr?: string
): FaunaSpecies[] {
  return ALL_FAUNA_SPECIES.filter((species) =>
    checkFaunaEligibility(species, saveData, timeOfDay, targetDateStr)
  );
}

/**
 * Checks if the player can greet the animal today for daily rewards.
 */
export function canGreetFauna(
  species: FaunaSpecies,
  saveData: RimbaSaveData,
  todayStr: string = toLocalDateString(new Date())
): boolean {
  const interactions = saveData.animal_interactions || {};
  return interactions[species] !== todayStr;
}

export interface GreetFaunaResult {
  ok: boolean;
  message: string;
  goldEarned: number;
  xpEarned: number;
  updatedSaveData: RimbaSaveData;
}

/**
 * Greets an active animal, awarding once-per-day gold & XP rewards.
 */
export function greetFauna(
  species: FaunaSpecies,
  saveData: RimbaSaveData,
  timeOfDay: TimeOfDay = 'day',
  todayStr: string = toLocalDateString(new Date())
): GreetFaunaResult {
  const config = FAUNA_CONFIG[species];
  if (!config) {
    return {
      ok: false,
      message: 'Spesies satwa tidak ditemukan.',
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  // Verify habitat eligibility
  const isEligible = checkFaunaEligibility(species, saveData, timeOfDay, todayStr);
  if (!isEligible) {
    return {
      ok: false,
      message: `${config.name} belum dapat hadir di pulau. ${config.unlockConditionText}`,
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  // Verify daily greeting limit
  if (!canGreetFauna(species, saveData, todayStr)) {
    return {
      ok: false,
      message: `Kamu sudah menyapa ${config.name} hari ini! Kembali lagi besok.`,
      goldEarned: 0,
      xpEarned: 0,
      updatedSaveData: saveData,
    };
  }

  // Record daily interaction and ledger rewards
  const goldEntry = createLedgerEntry(
    'gold',
    config.dailyReward.gold,
    `fauna_greet_${species}`,
    `fauna_${species}_${todayStr}`
  );
  const xpEntry = createLedgerEntry(
    'xp',
    config.dailyReward.xp,
    `fauna_greet_${species}`,
    `fauna_${species}_${todayStr}`
  );

  const updatedLedger = [...saveData.currency_ledger, goldEntry, xpEntry];
  const { gold, xp } = calculateBalances(updatedLedger);

  const updatedInteractions = {
    ...(saveData.animal_interactions || {}),
    [species]: todayStr,
  };

  const updatedSaveData: RimbaSaveData = {
    ...saveData,
    profile: {
      ...saveData.profile,
      goldCached: gold,
      xp: xp,
    },
    currency_ledger: updatedLedger,
    animal_interactions: updatedInteractions,
  };

  return {
    ok: true,
    message: `${config.name} menyambutmu hangat! +${config.dailyReward.gold} Soul, +${config.dailyReward.xp} XP.`,
    goldEarned: config.dailyReward.gold,
    xpEarned: config.dailyReward.xp,
    updatedSaveData,
  };
}
