import { ObjectType, FocusTag, TreeSpecies, TimeOfDay } from '@/types/game';

export interface CatalogItem {
  id: string;
  type: ObjectType;
  name: string;
  cost: number;
  model: string;
  category: 'Water & Rivers' | 'Flora & Fungi' | 'Rocks & Timber' | 'Structures' | 'Paths';
  description: string;
}

export const BUILD_CATALOG: CatalogItem[] = [
  // --- WATER & RIVERS ---
  {
    id: 'river_stream',
    type: 'path',
    name: 'Aliran Sungai Rimba',
    cost: 10,
    model: 'river_stream',
    category: 'Water & Rivers',
    description: 'Aliran air sungai jernih dengan tepian pasir landai untuk membelah pulau.',
  },
  {
    id: 'river_bend',
    type: 'path',
    name: 'Kelokan Sungai Alami',
    cost: 12,
    model: 'river_stream',
    category: 'Water & Rivers',
    description: 'Aliran air melengkung anggun untuk menciptakan liku sungai alami.',
  },
  {
    id: 'river_pond',
    type: 'path',
    name: 'Danau Teratai Tenang',
    cost: 15,
    model: 'river_stream',
    category: 'Water & Rivers',
    description: 'Genangan kolam air jernih dengan gemericik riak penyejuk pulau.',
  },
  {
    id: 'river_boulder',
    type: 'rock',
    name: 'Batu Air Muara',
    cost: 8,
    model: 'fabz_rounded_rock',
    category: 'Water & Rivers',
    description: 'Batu kali halus pembelah aliran air di muara sungai rimba.',
  },

  // --- FLORA & FUNGI ---
  {
    id: 'flower_red',
    type: 'rock',
    name: 'Crimson Wildflowers',
    cost: 10,
    model: 'flower_red',
    category: 'Flora & Fungi',
    description: 'Bright red forest blossoms that attract butterflies.',
  },
  {
    id: 'flower_yellow',
    type: 'rock',
    name: 'Golden Buttercups',
    cost: 10,
    model: 'flower_yellow',
    category: 'Flora & Fungi',
    description: 'Sunny yellow meadow flowers waving in the breeze.',
  },
  {
    id: 'flower_purple',
    type: 'rock',
    name: 'Lavender Bluebells',
    cost: 10,
    model: 'flower_purple',
    category: 'Flora & Fungi',
    description: 'Gentle purple flowers with soothing fragrance.',
  },
  {
    id: 'mushroom_red',
    type: 'rock',
    name: 'Fairy Cap Shrooms',
    cost: 12,
    model: 'mushroom_red',
    category: 'Flora & Fungi',
    description: 'Vibrant red-spotted forest mushrooms growing in a cozy cluster.',
  },
  {
    id: 'bush',
    type: 'rock',
    name: 'Lush Forest Shrub',
    cost: 10,
    model: 'bush',
    category: 'Flora & Fungi',
    description: 'A dense leafy green bush that softens corners.',
  },
  {
    id: 'shroom_amanita',
    type: 'rock',
    name: 'Jamur Amanita Merah',
    cost: 14,
    model: 'shroom_amanita',
    category: 'Flora & Fungi',
    description: 'Jamur payung merah berbintik putih ikonik penghias lantai hutan.',
  },
  {
    id: 'shroom_chanterelle',
    type: 'rock',
    name: 'Jamur Chanterelle Emas',
    cost: 14,
    model: 'shroom_chanterelle',
    category: 'Flora & Fungi',
    description: 'Jamur hutan kuning keemasan berbentuk corong yang hangat.',
  },
  {
    id: 'lp_mushroom_cluster',
    type: 'rock',
    name: 'Rumpun Jamur Payung',
    cost: 15,
    model: 'lp_mushroom_cluster',
    category: 'Flora & Fungi',
    description: 'Keluarga jamur hutan yang tumbuh berdampingan di tanah lembap.',
  },
  {
    id: 'forest_fruit_bush',
    type: 'rock',
    name: 'Semak Beri Merah',
    cost: 14,
    model: 'forest_fruit_bush',
    category: 'Flora & Fungi',
    description: 'Semak hijau rimbun penuh buah beri merah kesukaan burung rimba.',
  },
  {
    id: 'fabz_flower_crimson',
    type: 'rock',
    name: 'Bunga Mekar Delima',
    cost: 12,
    model: 'fabz_flower_crimson',
    category: 'Flora & Fungi',
    description: 'Bunga merah bermahkota kuning cerah yang mengundang lebah madu.',
  },
  {
    id: 'fabz_plant_fern',
    type: 'rock',
    name: 'Pakis Hutan Tropis',
    cost: 10,
    model: 'fabz_plant_fern',
    category: 'Flora & Fungi',
    description: 'Tanaman pakis berdaun menjari untuk memperkaya dasar pepohonan.',
  },
  {
    id: 'lp_bush_round',
    type: 'rock',
    name: 'Semak Belukar Rapi',
    cost: 11,
    model: 'lp_bush_round',
    category: 'Flora & Fungi',
    description: 'Semak bulat hijau segar dengan potongan geometris yang menenangkan.',
  },
  {
    id: 'platformer_plant',
    type: 'rock',
    name: 'Semak Pakis Rimba',
    cost: 8,
    model: 'platformer_plant',
    category: 'Flora & Fungi',
    description: 'Rumpun tanaman daun hijau segar bertekstur lembut.',
  },
  {
    id: 'platformer_flowers',
    type: 'rock',
    name: 'Rumpun Bunga Padang',
    cost: 10,
    model: 'platformer_flowers',
    category: 'Flora & Fungi',
    description: 'Kelopak bunga padang rumput ceria penghias tepi jalan.',
  },
  {
    id: 'platformer_flowers_tall',
    type: 'rock',
    name: 'Bunga Liar Semampai',
    cost: 12,
    model: 'platformer_flowers_tall',
    category: 'Flora & Fungi',
    description: 'Tangkai bunga liar anggun menjulang di sela rumput.',
  },
  {
    id: 'platformer_mushrooms',
    type: 'rock',
    name: 'Trio Jamur Rimba',
    cost: 12,
    model: 'platformer_mushrooms',
    category: 'Flora & Fungi',
    description: 'Tiga serangkai jamur hutan lucu di bawah naungan pohon.',
  },
  {
    id: 'platformer_hedge',
    type: 'rock',
    name: 'Pagar Tanaman Asri',
    cost: 10,
    model: 'platformer_hedge',
    category: 'Flora & Fungi',
    description: 'Pagar semak hijau rapi pembatas taman santai.',
  },
  {
    id: 'platformer_hedge_corner',
    type: 'rock',
    name: 'Sudut Pagar Tanaman',
    cost: 10,
    model: 'platformer_hedge_corner',
    category: 'Flora & Fungi',
    description: 'Siku belokan pagar semak hijau untuk sudut petak.',
  },

  // --- ROCKS & TIMBER ---
  {
    id: 'rock_tall',
    type: 'rock',
    name: 'Mountain Crag',
    cost: 20,
    model: 'rock_tall',
    category: 'Rocks & Timber',
    description: 'A tall rocky pillar that adds vertical diorama depth.',
  },
  {
    id: 'rock_small',
    type: 'rock',
    name: 'Pebble Cluster',
    cost: 10,
    model: 'rock_small',
    category: 'Rocks & Timber',
    description: 'A calm cluster of rounded pebbles along the bank.',
  },
  {
    id: 'stump',
    type: 'rock',
    name: 'Mossy Tree Stump',
    cost: 12,
    model: 'stump',
    category: 'Rocks & Timber',
    description: 'An ancient weathered stump carpeted with soft moss.',
  },
  {
    id: 'log',
    type: 'rock',
    name: 'Fallen Hollow Log',
    cost: 14,
    model: 'log',
    category: 'Rocks & Timber',
    description: 'A rustic fallen birch log offering shelter for wildlife.',
  },
  {
    id: 'survival_rock_flat_grass',
    type: 'rock',
    name: 'Batu Pipih Berumput',
    cost: 14,
    model: 'survival_rock_flat_grass',
    category: 'Rocks & Timber',
    description: 'Batu kali pipih berteras rumput yang tenang di tepi pulau.',
  },
  {
    id: 'survival_tree_log_small',
    type: 'rock',
    name: 'Batang Kayu Rebah Alami',
    cost: 12,
    model: 'survival_tree_log_small',
    category: 'Rocks & Timber',
    description: 'Kayu glondongan kecil alami tempat peristirahatan satwa.',
  },
  {
    id: 'survival_tree_autumn_tall',
    type: 'tree',
    name: 'Pohon Keemasan Tinggi',
    cost: 22,
    model: 'survival_tree_autumn_tall',
    category: 'Flora & Fungi',
    description: 'Pohon musim gugur menjulang tinggi dengan daun keemasan hangat.',
  },
  {
    id: 'lpset_rock_mossy_a',
    type: 'rock',
    name: 'Batu Lumut Zamrud',
    cost: 16,
    model: 'lpset_rock_mossy_a',
    category: 'Rocks & Timber',
    description: 'Batu alam tua yang diselimuti hamparan lumut hijau lembut.',
  },
  {
    id: 'lpset_rock_mossy_b',
    type: 'rock',
    name: 'Bongkahan Batu Berlumut',
    cost: 18,
    model: 'lpset_rock_mossy_b',
    category: 'Rocks & Timber',
    description: 'Batu sungai besar berlumut tebal, cocok di tepian aliran air.',
  },
  {
    id: 'fabz_rounded_rock',
    type: 'rock',
    name: 'Batu Kali Halus',
    cost: 12,
    model: 'fabz_rounded_rock',
    category: 'Rocks & Timber',
    description: 'Batu bulat abu-abu natural dengan faset poli rendah yang bersih.',
  },
  {
    id: 'pack_stump_moss',
    type: 'rock',
    name: 'Tunggul Kayu Lingkar',
    cost: 12,
    model: 'pack_stump_moss',
    category: 'Rocks & Timber',
    description: 'Tunggul pohon tua dengan detail lingkaran tahun yang hangat.',
  },
  {
    id: 'fabz_cut_trunk',
    type: 'rock',
    name: 'Pangkal Kayu Tebang',
    cost: 12,
    model: 'fabz_cut_trunk',
    category: 'Rocks & Timber',
    description: 'Potongan pangkal batang kayu berakar kokoh.',
  },
  {
    id: 'pack_wood_log_moss',
    type: 'rock',
    name: 'Kayu Rebah Hutan Tua',
    cost: 16,
    model: 'pack_wood_log_moss',
    category: 'Rocks & Timber',
    description: 'Batang pohon tumbang bercabang yang menjadi rumah mikro-ekosistem.',
  },
  {
    id: 'pack_wood_branch',
    type: 'rock',
    name: 'Ranting Kayu Alami',
    cost: 10,
    model: 'pack_wood_branch',
    category: 'Rocks & Timber',
    description: 'Cabang kayu kering di atas rumput untuk sentuhan hutan liar.',
  },
  {
    id: 'lp_ancient_root',
    type: 'rock',
    name: 'Akar Pohon Purba',
    cost: 15,
    model: 'lp_ancient_root',
    category: 'Rocks & Timber',
    description: 'Jalinan akar kayu menjalar yang menambah tekstur tanah pulau.',
  },
  {
    id: 'platformer_rocks',
    type: 'rock',
    name: 'Batu Bulat Lembah',
    cost: 10,
    model: 'platformer_rocks',
    category: 'Rocks & Timber',
    description: 'Sepasang batuan bundar halus bergaya kartun bersahaja.',
  },


  // --- COZY SANCTUARY CAMP ---
  {
    id: 'campfire',
    type: 'rock',
    name: 'Api Unggun Suaka',
    cost: 25,
    model: 'campfire',
    category: 'Structures',
    description: 'Lingkaran batu dengan bara api hangat untuk malam perenungan di rimba.',
  },
  {
    id: 'tent',
    type: 'rock',
    name: 'Tenda Penjaga Rimba',
    cost: 30,
    model: 'tent',
    category: 'Structures',
    description: 'Tenda kanvas sederhana tempat berteduh di bawah naungan kanopi.',
  },

  // --- PATHS & BRIDGES ---
  {
    id: 'mini_forest_bridge',
    type: 'path',
    name: 'Jembatan Kayu Rimba',
    cost: 24,
    model: 'mini_forest_bridge',
    category: 'Paths',
    description: 'Jembatan kayu alami khas hutan rimba untuk menghubungkan tepian sungai.',
  },
  {
    id: 'bridge_wood',
    type: 'path',
    name: 'Jembatan Lengkung Kayu',
    cost: 25,
    model: 'bridge_wood',
    category: 'Paths',
    description: 'Jembatan kayu melengkung yang tenang di atas aliran sungai.',
  },
  {
    id: 'fabz_flat_bridge',
    type: 'path',
    name: 'Jembatan Papan Rimba',
    cost: 28,
    model: 'fabz_flat_bridge',
    category: 'Paths',
    description: 'Jembatan kayu bertiang pancang kokoh untuk menyeberangi aliran sungai.',
  },
  {
    id: 'path_stepping',
    type: 'path',
    name: 'Batu Pijakan Alami',
    cost: 8,
    model: 'path_stepping',
    category: 'Paths',
    description: 'Susunan batu pijakan bulat alami di sela rerumputan rimba.',
  },
  {
    id: 'path_wood',
    type: 'path',
    name: 'Jalur Papan Kayu',
    cost: 8,
    model: 'path_wood',
    category: 'Paths',
    description: 'Pijakan bilah kayu alami di sepanjang tepian sungai.',
  },
  {
    id: 'path_stone',
    type: 'path',
    name: 'Batu Lempeng Lembah',
    cost: 5,
    model: 'path_stone',
    category: 'Paths',
    description: 'Batu lempeng alami untuk jejak langkah di tengah hutan.',
  },
];

export const GAME_CONFIG = {
  version: 1,
  storageKey: 'rimba_save_v1',
  focus: {
    defaultDurationMinutes: 25,
    defaultDurationSec: 25 * 60,
    devFastDurationSec: 10,
    baseXp: 100,
    baseGold: 25,
  },
  costs: {
    tree: 20,
    rock: 15,
    path: 5,
    bribe_bulldozer: 40,
    expand_land_tile: 35, // Gold cost to unlock an adjacent tile
  },
  restore: 50, // 50 Soul cost to restore withered stump / reclaimed tile
  reclamation: {
    inactivityHours: 48,
    devFastInactivityMinutes: 5,
    minObjectsToReclaim: 1,
    maxObjectsToReclaim: 2,
    checkIntervalMs: 30000,
    bulldozer_mark_cost: 40,
    bulldozer_clear_time_hours: 72,
    devFastClearMinutes: 8,
  },
  grid: {
    size: 10,
    tileSize: 1.0,
    offset: -4.5,
  },
} as const;

/**
 * 3x3 Starter Hub at Garden Center:
 * Provides immediate cozy playground without feeling empty or overwhelming
 */
export const STARTER_UNLOCKED_TILES: string[] = [
  '3,3', '4,3', '5,3',
  '3,4', '4,4', '5,4',
  '3,5', '4,5', '5,5',
];

export const FOCUS_TAGS: {
  id: FocusTag;
  label: string;
  color: string;
  bgLight: string;
  iconName: string;
  icon: string;
}[] = [
  { id: 'Belajar', label: 'Belajar', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'BookOpen', icon: 'BookOpen' },
  { id: 'Kerja', label: 'Kerja', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'Briefcase', icon: 'Briefcase' },
  { id: 'Koding', label: 'Koding', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'Code', icon: 'Code' },
  { id: 'Membaca', label: 'Membaca', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'BookMarked', icon: 'BookMarked' },
  { id: 'Kreatif', label: 'Kreatif', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'Palette', icon: 'Palette' },
  { id: 'Mindfulness', label: 'Tenang', color: '#1E5638', bgLight: '#F0FDF4', iconName: 'Heart', icon: 'Heart' },
];

export const FOCUS_PRESETS = [
  { minutes: 15, label: '15m (Kilat)', rewardMultiplier: 0.6 },
  { minutes: 25, label: '25m (Pomodoro)', rewardMultiplier: 1.0 },
  { minutes: 45, label: '45m (Deep Work)', rewardMultiplier: 1.8 },
  { minutes: 60, label: '60m (Maraton)', rewardMultiplier: 2.5 },
] as const;

export interface TreeSpeciesConfig {
  id: TreeSpecies;
  name: string;
  levelRequired: number;
  icon: string;
  modelVariant: string;
  description: string;
  leafColor: string;
}

export const TREE_SPECIES_CONFIG: TreeSpeciesConfig[] = [
  {
    id: 'oak',
    name: 'Pohon Rimba Klasik',
    levelRequired: 1,
    icon: '🌳',
    modelVariant: 'tree_oak',
    description: 'Kanopi hijau segar bersahaja, lambang awal perjalanan fokus.',
    leafColor: '#82C84A',
  },
  {
    id: 'birch',
    name: 'Birch Muda Anggun',
    levelRequired: 2,
    icon: '🌿',
    modelVariant: 'tree_small',
    description: 'Pohon muda ramping yang memberi kelembutan pada sudut pulau.',
    leafColor: '#95D65B',
  },
  {
    id: 'pine',
    name: 'Cemara Pinus Pegunungan',
    levelRequired: 3,
    icon: '🌲',
    modelVariant: 'tree_pineDefaultA',
    description: 'Runcing anggun & tahan banting, dedaunan hijau cemara pegunungan.',
    leafColor: '#2E6B3D',
  },
  {
    id: 'elm',
    name: 'Elm Kanopi Rindang',
    levelRequired: 4,
    icon: '🌳',
    modelVariant: 'tree_default',
    description: 'Pohon elm bertajuk bulat rimbun yang teduh dan asri.',
    leafColor: '#5EA836',
  },
  {
    id: 'autumn',
    name: 'Oak Musim Gugur Emas',
    levelRequired: 5,
    icon: '🍁',
    modelVariant: 'tree_oak_fall',
    description: 'Daun oranye keemasan hangat, memancarkan ketenangan senja.',
    leafColor: '#D97706',
  },
  {
    id: 'round_oak',
    name: 'Beringin Kanopi Bulat',
    levelRequired: 6,
    icon: '🌳',
    modelVariant: 'pack_tree_round_oak',
    description: 'Pohon bertajuk bulat padat dengan perpaduan warna daun alami.',
    leafColor: '#3B7A57',
  },
  {
    id: 'banana',
    name: 'Pisang Hutan Tropis',
    levelRequired: 7,
    icon: '🍌',
    modelVariant: 'lpset_tree_banana',
    description: 'Pohon pisang berdaun lebar segar khas tepian rimba Nusantara.',
    leafColor: '#68B936',
  },
  {
    id: 'savannah',
    name: 'Akasia Sabana Emas',
    levelRequired: 8,
    icon: '🌾',
    modelVariant: 'fabz_tree_savannah',
    description: 'Pohon akasia bertajuk datar dengan rona hijau-keemasan hangat.',
    leafColor: '#B0A83B',
  },
  {
    id: 'cypress',
    name: 'Siprus Menara Angin',
    levelRequired: 9,
    icon: '🌲',
    modelVariant: 'pack_tree_tall_cypress',
    description: 'Pohon menjulang ramping yang memberi aksen vertikal megah.',
    leafColor: '#245E3F',
  },
  {
    id: 'nordic_pine',
    name: 'Cemara Kabut Utara',
    levelRequired: 10,
    icon: '🌲',
    modelVariant: 'lpset_tree_nordic_pine',
    description: 'Pohon konifer hijau zamrud tua dengan tekstur geometris tajam.',
    leafColor: '#1B4D3E',
  },
  {
    id: 'palm',
    name: 'Palem Tropis Pesisir',
    levelRequired: 11,
    icon: '🌴',
    modelVariant: 'tree_palm',
    description: 'Pelepah daun eksotis berayun, nuansa santai pulau tropis.',
    leafColor: '#4E9A38',
  },
  {
    id: 'coconut',
    name: 'Kelapa Gading Pesisir',
    levelRequired: 12,
    icon: '🥥',
    modelVariant: 'lpset_tree_coconut',
    description: 'Pohon kelapa menjulang anggun dengan pelepah tropis rindang.',
    leafColor: '#3E9447',
  },
  {
    id: 'tiered_pine',
    name: 'Pinus Bertingkat Kerajaan',
    levelRequired: 13,
    icon: '🌲',
    modelVariant: 'pack_tree_tiered_pine',
    description: 'Cemara berlapis tiga gradasi warna daun hijau hutan yang agung.',
    leafColor: '#225B42',
  },
  {
    id: 'baobab',
    name: 'Baobab Sakral Raksasa',
    levelRequired: 14,
    icon: '🌳',
    modelVariant: 'fabz_tree_baobab',
    description: 'Pohon besar berbatang kokoh perkasa penampung kehidupan alam.',
    leafColor: '#4E7D3C',
  },
  {
    id: 'ancient',
    name: 'Pohon Leluhur Kuno',
    levelRequired: 15,
    icon: '✨',
    modelVariant: 'tree_detailed',
    description: 'Pohon sakral megah berlapis dengan perakaran kokoh dan aura agung.',
    leafColor: '#3E8E41',
  },
  {
    id: 'platformer_pine',
    name: 'Pinus Kanopi Runcing',
    levelRequired: 16,
    icon: '🌲',
    modelVariant: 'platformer_tree_pine',
    description: 'Pohon pinus kerucut gagah penyejuk sudut pulau.',
    leafColor: '#2C6E49',
  },
  {
    id: 'round_snow',
    name: 'Pohon Bundar Salju',
    levelRequired: 19,
    icon: '❄️',
    modelVariant: 'platformer_tree_snow',
    description: 'Pohon bundar berselimut salju tebal murni musim dingin.',
    leafColor: '#E2E8F0',
  },
  {
    id: 'pine_snow',
    name: 'Pinus Salju Abadi',
    levelRequired: 20,
    icon: '🏔️',
    modelVariant: 'platformer_tree_pine_snow',
    description: 'Pohon pinus es megah dengan lapisan salju abadi puncak gunung.',
    leafColor: '#FFFFFF',
  },
];

export interface AtmosphereSettings {
  name: string;
  label: string;
  icon: string;
  bgColor: string;
  fogColor: string;
  ambientColor: string;
  ambientIntensity: number;
  skyBounce: string;
  groundBounce: string;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  shadowOpacity: number;
  contactShadowColor: string;
}

export const ATMOSPHERE_CONFIG: Record<TimeOfDay, AtmosphereSettings> = {
  day: {
    name: 'Kanopi Hujan',
    label: 'Siang',
    icon: '☀️',
    bgColor: '#A7D3BF',
    fogColor: '#A7D3BF',
    ambientColor: '#E6F8EE',
    ambientIntensity: 0.72,
    skyBounce: '#F0FDF4',
    groundBounce: '#86EFAC',
    sunColor: '#FFFDF0',
    sunIntensity: 1.45,
    sunPosition: [14, 18, 14],
    shadowOpacity: 0.28,
    contactShadowColor: '#064E3B',
  },
  sunset: {
    name: 'Kabut Lembah',
    label: 'Senja',
    icon: '🌅',
    bgColor: '#EFA578',
    fogColor: '#EFA578',
    ambientColor: '#FFEDD5',
    ambientIntensity: 0.68,
    skyBounce: '#FFF7ED',
    groundBounce: '#FDBA74',
    sunColor: '#FB923C',
    sunIntensity: 1.42,
    sunPosition: [18, 10, 10],
    shadowOpacity: 0.32,
    contactShadowColor: '#431407',
  },
  night: {
    name: 'Malam Berbintang',
    label: 'Malam',
    icon: '🌙',
    bgColor: '#081B26',
    fogColor: '#081B26',
    ambientColor: '#0F2236',
    ambientIntensity: 0.60,
    skyBounce: '#1E293B',
    groundBounce: '#0B1320',
    sunColor: '#A5C8E8',
    sunIntensity: 0.42,
    sunPosition: [12, 16, 12],
    shadowOpacity: 0.22,
    contactShadowColor: '#040910',
  },
};

export function detectLocalTimeOfDay(date: Date = new Date()): TimeOfDay {
  if (typeof window === 'undefined' && arguments.length === 0) return 'day';
  const decimalHours = date.getHours() + date.getMinutes() / 60;
  if (decimalHours >= 6 && decimalHours < 16.5) return 'day';
  if (decimalHours >= 16.5 && decimalHours < 18.5) return 'sunset';
  return 'night';
}

