import { FaunaConfig, FaunaSpecies, RimbaSaveData, TimeOfDay, WorldObject } from '@/types/game';
import { calculateAnalytics, toLocalDateString } from './analytics';
import { calculateBalances, createLedgerEntry } from './economy';
import { getUnlockedTilesSet } from './worldRules';
import { getLevelFromXp } from './levelRules';

export const FAUNA_CONFIG: Record<FaunaSpecies, FaunaConfig> = {
  bee: {
    id: 'bee',
    name: 'Lebah Madu',
    title: 'Penyelaras Bunga',
    icon: '🐝',
    description: 'Pekerja keras pengumpul nektar manis.',
    unlockConditionText: 'Perlu 1+ bunga atau semak.',
    greetingQuote: 'Dengungan riangnya membawa aroma madu manis.',
    sleepQuote: 'Tertidur hangat di dalam kuncup bunga.',
    dailyReward: { gold: 5, xp: 15 },
  },
  butterfly: {
    id: 'butterfly',
    name: 'Kupu-Kupu Sutra',
    title: 'Penari Kelopak',
    icon: '🦋',
    description: 'Penari udara pembawa keceriaan padang mekar.',
    unlockConditionText: 'Perlu 1+ bunga mekar di suaka.',
    greetingQuote: 'Kepakan sayap lembutnya menyapa hangat.',
    sleepQuote: 'Hinggap tenang di kelopak bunga malam.',
    dailyReward: { gold: 5, xp: 15 },
  },
  bird: {
    id: 'bird',
    name: 'Burung Kicau',
    title: 'Penjaga Dahan',
    icon: '🐦',
    description: 'Penyanyi merdu di pucuk pepohonan.',
    unlockConditionText: 'Level 2+, 12+ petak & 2+ pohon.',
    greetingQuote: 'Kicauan merdunya menyegarkan pikiranmu.',
    sleepQuote: 'Beristirahat tenang di sarang dahan.',
    dailyReward: { gold: 5, xp: 15 },
  },
  rabbit: {
    id: 'rabbit',
    name: 'Kelinci Padang',
    title: 'Penjelajah Rumput',
    icon: '🐇',
    description: 'Pelompat lincah di hamparan rumput luas.',
    unlockConditionText: 'Level 1+ & 9+ petak suaka.',
    greetingQuote: 'Hidungnya berkedut ramah menyambutmu.',
    sleepQuote: 'Meringkuk pulas di balik rumput lembut.',
    dailyReward: { gold: 5, xp: 15 },
  },
  fox: {
    id: 'fox',
    name: 'Rubah Rimba',
    title: 'Pengelana Hangat',
    icon: '🦊',
    description: 'Pengelana cerdas berbulu lebat kemerahan.',
    unlockConditionText: 'Level 3+, 16+ petak & 2+ pohon.',
    greetingQuote: 'Ekor lebatnya bergoyang menyapa hangat.',
    sleepQuote: 'Tertidur melingkar memeluk ekornya.',
    dailyReward: { gold: 5, xp: 15 },
  },
  koala: {
    id: 'koala',
    name: 'Koala Rimba',
    title: 'Penenang Dahan',
    icon: '🐨',
    description: 'Sahabat tenang pemeluk batang pohon rindang.',
    unlockConditionText: 'Level 2+, 1+ pohon & 1+ sesi fokus.',
    greetingQuote: 'Tatapan tenangnya menyejukkan hatimu.',
    sleepQuote: 'Memeluk dahan terlelap mimpi indah.',
    dailyReward: { gold: 5, xp: 15 },
  },
  mystic_stag: {
    id: 'mystic_stag',
    name: 'Rusa Suaka',
    title: 'Pelindung Lembah',
    icon: '🦌',
    description: 'Penjaga suaka yang anggun bertanduk indah.',
    unlockConditionText: 'Level 4+, 20+ petak, 3+ pohon & streak 2 hari.',
    greetingQuote: 'Langkah anggunnya memancarkan kedamaian suaka.',
    sleepQuote: 'Bersimpuh tenang di bawah sinar rembulan.',
    dailyReward: { gold: 5, xp: 15 },
  },
  deer: {
    id: 'deer',
    name: 'Rusa Suaka',
    title: 'Pelindung Lembah',
    icon: '🦌',
    description: 'Penjaga suaka yang anggun bertanduk indah.',
    unlockConditionText: 'Level 4+, 20+ petak, 3+ pohon & streak 2 hari.',
    greetingQuote: 'Langkah anggunnya memancarkan kedamaian suaka.',
    sleepQuote: 'Bersimpuh tenang di bawah sinar rembulan.',
    dailyReward: { gold: 5, xp: 15 },
  },
  elephant: {
    id: 'elephant',
    name: 'Gajah Suaka',
    title: 'Raksasa Lembut',
    icon: '🐘',
    description: 'Raksasa berhati damai pelindung padang.',
    unlockConditionText: 'Level 7+, 28+ petak luas & 4+ pohon.',
    greetingQuote: 'Belalainya melambai riang menyambutmu.',
    sleepQuote: 'Tertidur pulas bersandar di tanah lapang.',
    dailyReward: { gold: 5, xp: 15 },
  },
  tiger: {
    id: 'tiger',
    name: 'Harimau Belukar',
    title: 'Penjaga Rimba',
    icon: '🐅',
    description: 'Pengelana berwibawa di keteduhan semak.',
    unlockConditionText: 'Level 8+, 28+ petak, 4+ pohon & 3+ batu/semak.',
    greetingQuote: 'Langkah gagahnya penuh kewibawaan rimba.',
    sleepQuote: 'Mendengkur halus terlelap di keteduhan.',
    dailyReward: { gold: 5, xp: 15 },
  },
  polar: {
    id: 'polar',
    name: 'Beruang Kutub',
    title: 'Pangeran Salju',
    icon: '🐻‍❄️',
    description: 'Beruang putih hangat pengelana salju.',
    unlockConditionText: 'Level 4+, 16+ petak & Bioma Salju aktif.',
    greetingQuote: 'Napas hangatnya mencairkan dinginnya es.',
    sleepQuote: 'Meringkuk hangat dalam selimut salju.',
    dailyReward: { gold: 5, xp: 15 },
  },
  panda: {
    id: 'panda',
    name: 'Panda Santai',
    title: 'Pencinta Damai',
    icon: '🐼',
    description: 'Panda ceria penyuka keasrian taman hijau.',
    unlockConditionText: 'Level 5+, 20+ petak, 3+ pohon & 2+ tanaman.',
    greetingQuote: 'Duduk santai menikmati semilir angin rimba.',
    sleepQuote: 'Tergolek kenyang tertidur di padang rumput.',
    dailyReward: { gold: 5, xp: 15 },
  },
  monkey: {
    id: 'monkey',
    name: 'Monyet Ceria',
    title: 'Pesenam Tajuk',
    icon: '🐒',
    description: 'Pesenam dahan yang riang dan lincah.',
    unlockConditionText: 'Level 3+, 16+ petak & 3+ pohon rimbun.',
    greetingQuote: 'Melompat ceria menyapa dari atas dahan.',
    sleepQuote: 'Tidur bersandar aman di cabang pohon tinggi.',
    dailyReward: { gold: 5, xp: 15 },
  },
  lion: {
    id: 'lion',
    name: 'Singa Sabana',
    title: 'Raja Wibawa',
    icon: '🦁',
    description: 'Penjaga ketenangan suaka berwibawa agung.',
    unlockConditionText: 'Level 9+, 32+ petak luas & 60+ menit fokus.',
    greetingQuote: 'Tatapan hangatnya mengayomi seluruh suaka.',
    sleepQuote: 'Terlelap gagah di bawah naungan bintang.',
    dailyReward: { gold: 5, xp: 15 },
  },
  hog: {
    id: 'hog',
    name: 'Babi Hutan',
    title: 'Penjelajah Tanah',
    icon: '🐗',
    description: 'Pengembara tekun penyuka akar bebatuan.',
    unlockConditionText: 'Level 4+, 18+ petak & 2+ batu/semak.',
    greetingQuote: 'Moncongnya ramah mengendus kesegaran tanah.',
    sleepQuote: 'Meringkuk damai di samping bebatuan.',
    dailyReward: { gold: 5, xp: 15 },
  },
  giraffe: {
    id: 'giraffe',
    name: 'Jerapah Sabana',
    title: 'Pengamat Cakrawala',
    icon: '🦒',
    description: 'Sahabat berleher jenjang pengagum pucuk daun.',
    unlockConditionText: 'Level 6+, 24+ petak padang luas & 4+ pohon.',
    greetingQuote: 'Menundukkan kepala anggun menyapamu.',
    sleepQuote: 'Menekuk lehernya tenang terlelap damai.',
    dailyReward: { gold: 5, xp: 15 },
  },
  fish: {
    id: 'fish',
    name: 'Ikan Koi Sungai',
    title: 'Penari Arus',
    icon: '🐟',
    description: 'Perenang lincah di beningnya aliran sungai.',
    unlockConditionText: 'Level 2+, 14+ petak & 2+ petak sungai.',
    greetingQuote: 'Kibasan ekornya membelah riak air jernih.',
    sleepQuote: 'Melayang tenang melamun di riak air malam.',
    dailyReward: { gold: 5, xp: 15 },
  },
  cat: {
    id: 'cat',
    name: 'Kucing Kemah',
    title: 'Penjaga Tenda',
    icon: '🐱',
    description: 'Sahabat setia perkemahan suaka rimba.',
    unlockConditionText: 'Level 2+, 12+ petak & Tenda Kemah.',
    greetingQuote: 'Mendengkur manja menggosokkan tubuhnya.',
    sleepQuote: 'Meringkuk bulat mendengkur di dekat tenda.',
    dailyReward: { gold: 5, xp: 15 },
  },
  beaver: {
    id: 'beaver',
    name: 'Berang-berang',
    title: 'Arsitek Tepian',
    icon: '🦫',
    description: 'Penyelam cerdas arsitek tepian sungai.',
    unlockConditionText: 'Level 4+, 18+ petak, 2+ sungai & 2+ pohon.',
    greetingQuote: 'Tepukan ekornya yang riang menyapa dari sungai.',
    sleepQuote: 'Tidur terapung pulas di tepian aliran air.',
    dailyReward: { gold: 5, xp: 15 },
  },
};

export const ALL_FAUNA_SPECIES: FaunaSpecies[] = [
  'bee',
  'bird',
  'rabbit',
  'fox',
  'koala',
  'mystic_stag',
  'elephant',
  'tiger',
  'polar',
  'panda',
  'monkey',
  'lion',
  'hog',
  'giraffe',
  'fish',
  'cat',
  'beaver',
];

/**
 * Checks if a world object is a flower, bush, or shrub that attracts pollinators.
 */
export function isFlowerOrBush(obj: WorldObject): boolean {
  if (obj.status !== 'active') return false;
  const variant = (obj.model_variant || '').toLowerCase();
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
  targetDateStr?: string,
  activeBiome: 'meadow' | 'snow' = 'meadow'
): boolean {
  const worldObjects = saveData.world_objects || [];
  const playerLevel = getLevelFromXp(saveData.profile.xp);
  const unlockedSet = getUnlockedTilesSet(saveData.world, worldObjects);
  const landSize = unlockedSet.size;
  const treeCount = countMatureTrees(worldObjects);
  const flowerCount = worldObjects.filter((obj) => isFlowerOrBush(obj)).length;

  const riverCount = worldObjects.filter(
    (obj) => obj.status === 'active' && (obj.model_variant || '').toLowerCase().includes('river')
  ).length;

  const rockOrBushCount = worldObjects.filter(
    (obj) =>
      obj.status === 'active' &&
      (obj.object_type === 'rock' ||
        isFlowerOrBush(obj) ||
        (obj.model_variant || '').toLowerCase().includes('rock') ||
        (obj.model_variant || '').toLowerCase().includes('stone'))
  ).length;

  const hasCamp = worldObjects.some(
    (obj) =>
      obj.status === 'active' &&
      ((obj.model_variant || '').toLowerCase().includes('tent') ||
        (obj.id || '').toLowerCase().includes('tent'))
  );

  const focusSessions = saveData.focus_sessions || [];
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  switch (species) {
    case 'bee':
    case 'butterfly':
      // Syarat: Bunga mekar aktif di suaka
      return flowerCount >= 1;

    case 'rabbit':
      // Syarat: Level 1+ & Lahan minimal 9 petak (starter core)
      return playerLevel >= 1 && landSize >= 9;

    case 'bird':
      // Syarat: Level 2+, Lahan 12+ petak, Pohon 2+
      return playerLevel >= 2 && landSize >= 12 && treeCount >= 2;

    case 'koala': {
      // Syarat: Level 2+, Pohon 1+, Sesi fokus 1+ (atau ada pohon lebat)
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
      return playerLevel >= 2 && treeCount >= 1 && (focusSessions.length >= 1 || hasDenseTree);
    }

    case 'cat':
      // Syarat: Level 2+, Lahan 12+ petak & Tenda kemah berdiri
      return playerLevel >= 2 && landSize >= 12 && hasCamp;

    case 'fish':
      // Syarat: Level 2+, Lahan 14+ petak & 2+ petak aliran sungai
      return playerLevel >= 2 && landSize >= 14 && riverCount >= 2;

    case 'fox':
      // Syarat: Level 3+, Lahan 16+ petak & 2+ pohon
      return playerLevel >= 3 && landSize >= 16 && treeCount >= 2;

    case 'monkey':
      // Syarat: Level 3+, Lahan 16+ petak & 3+ pohon rimbun
      return playerLevel >= 3 && landSize >= 16 && treeCount >= 3;

    case 'hog':
      // Syarat: Level 4+, Lahan 18+ petak & 2+ batu/semak
      return playerLevel >= 4 && landSize >= 18 && rockOrBushCount >= 2;

    case 'beaver':
      // Syarat: Level 4+, Lahan 18+ petak, 2+ sungai & 2+ pohon
      return playerLevel >= 4 && landSize >= 18 && riverCount >= 2 && treeCount >= 2;

    case 'polar':
      // Syarat: Bioma Salju aktif, Level 4+, Lahan 16+ petak
      return activeBiome === 'snow' && playerLevel >= 4 && landSize >= 16;

    case 'mystic_stag':
    case 'deer': {
      // Syarat: Level 4+, Lahan 20+ petak, 3+ pohon & (streak fokus 2 hari ATAU saat malam)
      if (playerLevel < 4 || landSize < 20 || treeCount < 3) return false;
      if (timeOfDay === 'night') return true;
      const refDate = targetDateStr ? new Date(targetDateStr) : new Date();
      const analytics = calculateAnalytics(saveData.focus_sessions, refDate);
      return analytics.currentStreak >= 2;
    }

    case 'panda':
      // Syarat: Level 5+, Lahan 20+ petak, 3+ pohon & 2+ tanaman
      return playerLevel >= 5 && landSize >= 20 && treeCount >= 3 && flowerCount >= 2;

    case 'giraffe':
      // Syarat: Level 6+, Lahan 24+ petak (padang savana luas) & 4+ pohon
      return playerLevel >= 6 && landSize >= 24 && treeCount >= 4;

    case 'elephant':
      // Syarat: Level 7+, Lahan 28+ petak (padang lapang luas) & 4+ pohon
      return playerLevel >= 7 && landSize >= 28 && treeCount >= 4;

    case 'tiger':
      // Syarat: Level 8+, Lahan 28+ petak, 4+ pohon & 3+ batu/semak
      return playerLevel >= 8 && landSize >= 28 && treeCount >= 4 && rockOrBushCount >= 3;

    case 'lion':
      // Syarat: Level 9+, Lahan 32+ petak megah & 60+ menit total fokus
      return playerLevel >= 9 && landSize >= 32 && totalFocusMinutes >= 60;

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
  targetDateStr?: string,
  activeBiome: 'meadow' | 'snow' = 'meadow'
): FaunaSpecies[] {
  return ALL_FAUNA_SPECIES.filter((species) =>
    checkFaunaEligibility(species, saveData, timeOfDay, targetDateStr, activeBiome)
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
  todayStr: string = toLocalDateString(new Date()),
  activeBiome: 'meadow' | 'snow' = 'meadow'
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
  const isEligible = checkFaunaEligibility(species, saveData, timeOfDay, todayStr, activeBiome);
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
