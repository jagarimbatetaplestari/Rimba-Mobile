import { RimbaSaveData } from '@/types/game';

export type WisdomTradition = 'Nusantara' | 'Stoik' | 'Zen' | 'Hukum Alam';

export interface WisdomFragment {
  id: string;
  stage: number; // 1..8
  title: string;
  tradition: WisdomTradition;
  aphorism: string;
  reflection: string;
  hoursRequired: number; // Total focus hours needed to unlock
  treeStageName: string;
  auraColor: string;
  rewardSoul: number;
  rewardXp: number;
}

export const WISDOM_FRAGMENTS: WisdomFragment[] = [
  {
    id: 'wisdom_1_mulat_sarira',
    stage: 1,
    title: 'Mulat Sarira',
    tradition: 'Nusantara',
    aphorism: 'Mulat sarira hangrasa wani — Kenalilah dirimu sendiri sebelum menaklukkan dunia luar.',
    reflection: 'Langkah awal fokus bukanlah mengasingkan diri dari dunia, melainkan menjinakkan riak batin dan memilih hadir seutuhnya pada satu tarikan napas saat ini.',
    hoursRequired: 0.5, // 30 mins
    treeStageName: 'Bibit Keheningan',
    auraColor: '#10B981',
    rewardSoul: 25,
    rewardXp: 50,
  },
  {
    id: 'wisdom_2_dichotomy_control',
    stage: 2,
    title: 'Kendali Batin',
    tradition: 'Stoik',
    aphorism: 'Sebagian hal berada dalam kuasamu, sebagian besar tidak. Ketenangan sejati lahir saat kau mencurahkan daya pada apa yang bisa kau kendalikan.',
    reflection: 'Distraksi luar, notifikasi instan, dan kegaduhan zaman adalah cuaca yang melintas. Niat dan perhatianmu adalah satu-satunya benteng suaka yang kau kuasai.',
    hoursRequired: 2,
    treeStageName: 'Tunas Kesadaran',
    auraColor: '#14B8A6',
    rewardSoul: 40,
    rewardXp: 80,
  },
  {
    id: 'wisdom_3_mizu_no_kokoro',
    stage: 3,
    title: 'Pikiran Seperti Air',
    tradition: 'Zen',
    aphorism: 'Mizu no kokoro — Air keruh hanya akan menjadi bening jika kau membiarkannya diam tanpa terus diaduk.',
    reflection: 'Ketika pikiranmu lelah dan bercabang, jangan memaksakan produktivitas dengan kekerasan batin. Duduklah hening, biarkan endapan debu mengendap dengan sendirinya.',
    hoursRequired: 5,
    treeStageName: 'Ranting Kejernihan',
    auraColor: '#06B6D4',
    rewardSoul: 60,
    rewardXp: 120,
  },
  {
    id: 'wisdom_4_hamemayu_hayuning_bawana',
    stage: 4,
    title: 'Harmoni Semesta',
    tradition: 'Nusantara',
    aphorism: 'Hamemayu hayuning bawana — Memperindah dan memelihara keteraturan semesta, berawal dari keteduhan jiwa sendiri.',
    reflection: 'Setiap menit fokus mendalam yang kau tunaikan dengan integritas adalah sumbangsih nyata pada keteraturan semesta. Kau sedang merawat ruang hidup yang damai.',
    hoursRequired: 10,
    treeStageName: 'Batang Keteguhan',
    auraColor: '#3B82F6',
    rewardSoul: 100,
    rewardXp: 200,
  },
  {
    id: 'wisdom_5_amor_fati',
    stage: 5,
    title: 'Kesabaran Musim',
    tradition: 'Stoik',
    aphorism: 'Pohon pinus tertua tak pernah terburu-buru tumbuh tinggi. Ia menghabiskan musim dingin memperdalam cengkeraman akarnya.',
    reflection: 'Jangan mencemaskan lambatnya hasil. Kualitas karya mendalam membutuhkan musim tempaan yang sunyi dan kesabaran untuk mengakar kokoh di dalam tanah.',
    hoursRequired: 20,
    treeStageName: 'Kanopi Kebijaksanaan',
    auraColor: '#8B5CF6',
    rewardSoul: 150,
    rewardXp: 300,
  },
  {
    id: 'wisdom_6_wu_wei',
    stage: 6,
    title: 'Mengalir Bersama Arus',
    tradition: 'Zen',
    aphorism: 'Bambu yang lentur tidak patah diterpa badai topan; ia meliuk anggun mengikuti angin lalu kembali tegak tanpa dendam.',
    reflection: 'Produktivitas sejati bukanlah ketegangan kaku, melainkan keadaan mengalir (flow state) di mana batas antara dirimu dan tugasmu melebur menjadi satu tari kesadaran.',
    hoursRequired: 40,
    treeStageName: 'Bunga Pencerahan',
    auraColor: '#EC4899',
    rewardSoul: 250,
    rewardXp: 500,
  },
  {
    id: 'wisdom_7_sangkan_paraning_dumadi',
    stage: 7,
    title: 'Akar Kepulangan',
    tradition: 'Nusantara',
    aphorism: 'Sangkan paraning dumadi — Mengetahui dari mana jiwa berasal dan ke mana setiap langkah batin akan berpulang.',
    reflection: 'Ketika perhatianmu tak lagi mudah dibeli oleh ilusi digital, kau menemukan kembali keaslian dirimu: manusia yang merdeka, berakar, dan bertumbuh luhur.',
    hoursRequired: 75,
    treeStageName: 'Pohon Agung Resonansi',
    auraColor: '#F59E0B',
    rewardSoul: 400,
    rewardXp: 800,
  },
  {
    id: 'wisdom_8_hening_manunggal',
    stage: 8,
    title: 'Hening Manunggal',
    tradition: 'Hukum Alam',
    aphorism: 'Hutan tidak pernah membanggakan rindangnya; ia hanya memberi naungan bagi yang lelah dan nafas bagi semesta.',
    reflection: 'Puncak pencapaian fokus bukanlah angka di atas layar, melainkan kelapangan dada yang terpancar dalam caramu menghargai waktu, manusia lain, dan alam raya.',
    hoursRequired: 100,
    treeStageName: 'Pohon Abadi Semesta',
    auraColor: '#10B981',
    rewardSoul: 600,
    rewardXp: 1200,
  },
];

/**
 * Returns all wisdom fragments annotated with unlock status and progress.
 */
export function getWisdomProgress(saveData: RimbaSaveData) {
  const sessions = saveData.focus_sessions || [];
  const totalMinutes = sessions
    .filter((s) => s.status === 'completed' && s.completed_at)
    .reduce((acc, s) => acc + (s.duration_minutes || 25), 0);
  const totalHours = totalMinutes / 60;

  const claimedIds = new Set(saveData.claimed_story_chapters || []);

  const fragments = WISDOM_FRAGMENTS.map((frag) => {
    const isUnlocked = totalHours >= frag.hoursRequired;
    const progressPct = Math.min(100, Math.round((totalHours / frag.hoursRequired) * 100));
    const isClaimed = claimedIds.has(frag.id);

    return {
      ...frag,
      isUnlocked,
      progressPct,
      isClaimed,
      hoursRemaining: Math.max(0, Math.round((frag.hoursRequired - totalHours) * 10) / 10),
    };
  });

  const currentStageIndex = fragments.filter((f) => f.isUnlocked).length;
  const currentStage = currentStageIndex > 0 ? fragments[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex < fragments.length ? fragments[currentStageIndex] : null;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalMinutes,
    fragments,
    currentStage,
    nextStage,
    unlockedCount: currentStageIndex,
    totalCount: fragments.length,
  };
}
