import { RimbaSaveData } from '@/types/game';
import { getLevelFromXp } from './levelRules';
import { getUnlockedTilesSet } from './worldRules';
import { calculateAnalytics } from './analytics';

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  icon: string; // Line icon key (Sprout, Droplets, Trees, HeartHandshake, Compass, Sparkles)
  unlockDescription: string;
  narration: string;
  quote: string;
  reward: {
    gold: number;
    xp: number;
  };
  checkUnlocked: (saveData: RimbaSaveData) => { isUnlocked: boolean; progressText: string };
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'chap_1_seed',
    chapterNumber: 1,
    title: 'Benih di Tanah Sunyi',
    subtitle: 'Langkah Pertama Menjaga Suaka',
    icon: 'Sprout',
    unlockDescription: 'Capai Level 1 (Awal Permainan)',
    narration:
      'Setiap pohon rindang bermula dari sebiji benih kecil yang berani bertunas di tanah sunyi. Ketenangan pikiran bermula dari satu tarikan napas pertama yang sadar dan hadir.',
    quote: 'Hutan lebat tak terburu-buru tumbuh, namun dedaunannya menaungi semesta.',
    reward: { gold: 20, xp: 40 },
    checkUnlocked: (_saveData) => ({
      isUnlocked: true,
      progressText: '1/1 Terbuka',
    }),
  },
  {
    id: 'chap_2_water',
    chapterNumber: 2,
    title: 'Riak Air Penyejuk',
    subtitle: 'Aliran Hidup di Antara Bebatuan',
    icon: 'Droplets',
    unlockDescription: 'Capai Level 3 & Hadirkan Aliran Air',
    narration:
      'Air mengalir tanpa memaksa, meliuk ramah melewati rintangan bebatuan suaka. Seperti pikiran yang mengalir jernih, air membawa kesejukan bagi seluruh vegetasi di pulau.',
    quote: 'Jadilah seperti air rimba: tenang di kedalaman, mengalir menyejukkan kehidupan.',
    reward: { gold: 25, xp: 50 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const hasWater = saveData.world_objects.some(
        (o) =>
          (o.model_variant && (o.model_variant.includes('river') || o.model_variant.includes('water'))) ||
          o.object_type === 'path'
      );
      const isUnlocked = level >= 3 && hasWater;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/3, Air: ${hasWater ? 'Ada' : 'Belum'}`,
      };
    },
  },
  {
    id: 'chap_3_canopy',
    chapterNumber: 3,
    title: 'Kanopi Bertingkat',
    subtitle: 'Peneduh Jiwa yang Bertumbuh',
    icon: 'Trees',
    unlockDescription: 'Capai Level 5 & Tumbuhkan 5 Pohon',
    narration:
      'Dedaunan saling bertaut membentuk kanopi hijau yang menyejukkan. Cahaya matahari menembus sela dahan menjadi berkas harapan, melindungi tanah dari kepenatan dunia luar.',
    quote: 'Pikiran yang terawat menciptakan keteduhan di tengah riuhnya dunia.',
    reward: { gold: 30, xp: 60 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const treeCount = saveData.world_objects.filter((o) => o.object_type === 'tree').length;
      const isUnlocked = level >= 5 && treeCount >= 5;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/5, Pohon: ${treeCount}/5`,
      };
    },
  },
  {
    id: 'chap_4_fauna',
    chapterNumber: 4,
    title: 'Sahabat Satwa Liar',
    subtitle: 'Harmoni Jiwa dan Kehidupan Alam',
    icon: 'HeartHandshake',
    unlockDescription: 'Capai Level 7 & Sapa Satwa Liar',
    narration:
      'Satwa rimba mendekat bukan karena dipaksa, melainkan karena merasakan damai di pulau ini. Persahabatan sejati dengan alam lahir dari ketulusan hati dan kesunyian yang tenang.',
    quote: 'Kelembutan budi mengundang kedamaian yang bahkan satwa rimba dapat merasakannya.',
    reward: { gold: 35, xp: 70 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const greetedCount = Object.keys(saveData.animal_interactions || {}).length;
      const isUnlocked = level >= 7 && greetedCount >= 1;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/7, Satwa Disapa: ${greetedCount}/1`,
      };
    },
  },
  {
    id: 'chap_5_time',
    chapterNumber: 5,
    title: 'Lembah Penjaga Waktu',
    subtitle: 'Keteguhan Hati Tujuh Purnama',
    icon: 'Compass',
    unlockDescription: 'Capai Level 10 & Streak 7 Hari',
    narration:
      'Konsistensi bukan tentang berlari kencang, melainkan tentang kembali hadir hari demi hari. Akar suakamu kini mencengkeram bumi begitu kokoh, tak tergoyahkan oleh angin kencang.',
    quote: 'Waktu tidak dapat dikejar, namun dapat dipeluk dengan kehadiran penuh di saat ini.',
    reward: { gold: 45, xp: 90 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const analytics = calculateAnalytics(
        saveData.focus_sessions,
        new Date(),
        saveData.used_shield_dates || []
      );
      const streak = analytics.currentStreak;
      const isUnlocked = level >= 10 && streak >= 7;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/10, Streak: ${streak}/7 hari`,
      };
    },
  },
  {
    id: 'chap_6_nirvana',
    chapterNumber: 6,
    title: 'Suaka Nirwana Rimba',
    subtitle: 'Puncak Kebijaksanaan Pulau Mengambang',
    icon: 'Sparkles',
    unlockDescription: 'Capai Level 15 & Buka 20+ Petak Lahan',
    narration:
      'Dari segenggam tanah sunyi, lahirlah nirwana hijau terapung yang abadi. Di sini, setiap tarikan napas adalah suaka, dan setiap detik fokus adalah warisan ketenangan batin yang murni.',
    quote: 'Suaka terindah bukanlah tempat yang kau cari di luar, melainkan ketenangan yang kau rawat di dalam dirimu.',
    reward: { gold: 60, xp: 120 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const unlockedTiles = getUnlockedTilesSet(saveData.world, saveData.world_objects).size;
      const isUnlocked = level >= 15 && unlockedTiles >= 20;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/15, Petak: ${unlockedTiles}/20`,
      };
    },
  },
];
