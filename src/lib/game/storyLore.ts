import { RimbaSaveData } from '@/types/game';
import { getLevelFromXp } from './levelRules';
import { getUnlockedTilesSet } from './worldRules';
import { calculateAnalytics } from './analytics';

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  icon: string; // Line icon key (Sprout, Droplets, Trees, HeartHandshake, Compass, Sparkles, Shield)
  image: string; // Path to high-res WebP story background
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
    image: '/story/story_chapter_1.webp',
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
    image: '/story/story_chapter_2.webp',
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
    image: '/story/story_chapter_3.webp',
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
    id: 'chap_4_kinship',
    chapterNumber: 4,
    title: 'Kanopi Kasih Sayang',
    subtitle: 'Ikatan Hangat di Dahan Purba',
    icon: 'HeartHandshake',
    image: '/story/story_new_1.webp',
    unlockDescription: 'Capai Level 6 & Tumbuhkan 8 Pohon',
    narration:
      'Tinggi di sela kanopi purba, kehidupan dipeluk dengan kehangatan tanpa batas. Saat kita melambat, kita memberi ruang untuk melindungi apa yang berharga dan rentan.',
    quote: 'Kehangatan sejati bertumbuh bukan dari kecepatan, melainkan dari kesabaran merawat kebersamaan.',
    reward: { gold: 35, xp: 70 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const treeCount = saveData.world_objects.filter((o) => o.object_type === 'tree').length;
      const isUnlocked = level >= 6 && treeCount >= 8;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/6, Pohon: ${treeCount}/8`,
      };
    },
  },
  {
    id: 'chap_5_hearth',
    chapterNumber: 5,
    title: 'Perapian di Tepian Danau',
    subtitle: 'Menemukan Kembali Kehadiran di Bawah Senja',
    icon: 'Sparkles',
    image: '/story/story_new_3.webp',
    unlockDescription: 'Capai Level 8 & Miliki Struktur Suaka',
    narration:
      'Di bawah bulan sabit, penjaga suaka duduk bersanding di dekat bara hangat. Konservasi sejati dimulai ketika ambisi tunduk pada kehadiran hening.',
    quote: 'Di keheningan malam, bara kecil cukup untuk menerangi seluruh suaka batin.',
    reward: { gold: 40, xp: 80 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const hasStructure = saveData.world_objects.some(
        (o) => o.object_type === 'rock' || o.object_type === 'path' || (o.model_variant && o.model_variant.includes('tent'))
      );
      const isUnlocked = level >= 8 && hasStructure;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/8, Struktur: ${hasStructure ? 'Ada' : 'Belum'}`,
      };
    },
  },
  {
    id: 'chap_6_shadow',
    chapterNumber: 6,
    title: 'Bayangan yang Mendekat',
    subtitle: 'Saat Deru Bising Mengusik Keheningan',
    icon: 'Compass',
    image: '/story/story_new_2.webp',
    unlockDescription: 'Capai Level 10 & 60 Menit Total Fokus',
    narration:
      'Ketergesaan industri mendekat dengan gemuruh mesin di tapal batas hutan. Namun mata suaka tetap waspada, menjaga apa yang liar dan tak tergantikan.',
    quote: 'Keteguhan bukanlah melawan dengan amarah, melainkan berdiri kokoh tanpa goyah.',
    reward: { gold: 45, xp: 90 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const totalMinutes = (saveData.focus_sessions || []).reduce(
        (sum, s) => sum + (s.status === 'completed' ? (s.duration_minutes || 0) : 0),
        0
      );
      const isUnlocked = level >= 10 && totalMinutes >= 60;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/10, Fokus: ${totalMinutes}/60m`,
      };
    },
  },
  {
    id: 'chap_7_stand',
    chapterNumber: 7,
    title: 'Benteng Barisan Hidup',
    subtitle: 'Keberanian dari Tekad Bersama',
    icon: 'HeartHandshake',
    image: '/story/story_chapter_4.webp',
    unlockDescription: 'Capai Level 12 & Sapa Satwa Liar',
    narration:
      'Satwa rimba mendekat bukan karena dipaksa, melainkan karena merasakan damai di pulau ini. Persahabatan sejati dengan alam lahir dari ketulusan hati dan kesunyian yang tenang.',
    quote: 'Kelembutan budi mengundang kedamaian yang bahkan satwa rimba dapat merasakannya.',
    reward: { gold: 50, xp: 100 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const greetedCount = Object.keys(saveData.animal_interactions || {}).length;
      const isUnlocked = level >= 12 && greetedCount >= 1;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/12, Satwa Disapa: ${greetedCount}/1`,
      };
    },
  },
  {
    id: 'chap_8_valley',
    chapterNumber: 8,
    title: 'Lembah Terang Rembulan',
    subtitle: 'Cahaya Perak Menyelimuti Air Terjun',
    icon: 'Compass',
    image: '/story/story_chapter_5.webp',
    unlockDescription: 'Capai Level 14 & Streak 5 Hari',
    narration:
      'Konsistensi bukan tentang berlari kencang, melainkan tentang kembali hadir hari demi hari. Akar suakamu kini mencengkeram bumi begitu kokoh, tak tergoyahkan oleh angin kencang.',
    quote: 'Waktu tidak dapat dikejar, namun dapat dipeluk dengan kehadiran penuh di saat ini.',
    reward: { gold: 55, xp: 110 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const analytics = calculateAnalytics(
        saveData.focus_sessions,
        new Date(),
        saveData.used_shield_dates || []
      );
      const streak = analytics.currentStreak;
      const isUnlocked = level >= 14 && streak >= 5;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/14, Streak: ${streak}/5 hari`,
      };
    },
  },
  {
    id: 'chap_9_nirvana',
    chapterNumber: 9,
    title: 'Suaka Nirwana Rimba',
    subtitle: 'Puncak Kebijaksanaan Pulau Mengambang',
    icon: 'Sparkles',
    image: '/story/story_chapter_6.webp',
    unlockDescription: 'Capai Level 16 & Buka 20+ Petak Lahan',
    narration:
      'Dari segenggam tanah sunyi, lahirlah nirwana hijau terapung yang abadi. Di sini, setiap tarikan napas adalah suaka, dan setiap detik fokus adalah warisan ketenangan batin yang murni.',
    quote: 'Suaka terindah bukanlah tempat yang kau cari di luar, melainkan ketenangan yang kau rawat di dalam dirimu.',
    reward: { gold: 70, xp: 140 },
    checkUnlocked: (saveData) => {
      const level = getLevelFromXp(saveData.profile.xp);
      const unlockedTiles = getUnlockedTilesSet(saveData.world, saveData.world_objects).size;
      const isUnlocked = level >= 16 && unlockedTiles >= 20;
      return {
        isUnlocked,
        progressText: isUnlocked
          ? 'Terpenuhi'
          : `Level ${level}/16, Petak: ${unlockedTiles}/20`,
      };
    },
  },
];
