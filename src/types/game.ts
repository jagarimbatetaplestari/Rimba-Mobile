export type FocusSessionStatus = 'active' | 'completed' | 'abandoned';
export type ObjectType = 'tree' | 'rock' | 'path';
export type ObjectStatus = 'active' | 'reclaimed' | 'marked_for_clearing';
export type CurrencyType = 'gold' | 'xp';
export type WeatherType = 'clear' | 'rain' | 'mist';

export interface Profile {
  id: 'local-user';
  xp: number;
  goldCached: number;
  name?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface BulldozerThreat {
  active: boolean;
  target_tree_id: string;
  threatened_tile?: string; // "grid_x,grid_y" outer tile threatened by bulldozer
  position: [number, number, number];
  rotation: number;
  cone_positions: [[number, number, number], [number, number, number]];
  spawned_at: string; // ISO string
}

export interface CustomTagItem {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface World {
  id: string;
  name: string;
  last_focus_completed_at: string | null;
  last_reclamation_at: string | null;
  bulldozer?: BulldozerThreat | null;
  unlocked_tiles?: string[]; // list of active "grid_x,grid_y" coordinates (default: 3x3 starter hub)
  sealed_tiles?: string[]; // outer tiles temporarily sealed by Tier 2 Bulldozer inactivity until reclaimed
  last_expanded_tile?: string | null; // "grid_x,grid_y" most recently unlocked tile for rise animation
}

export type FocusTag = 'Belajar' | 'Kerja' | 'Koding' | 'Membaca' | 'Kreatif' | 'Mindfulness' | string;

export type TreeSpecies =
  | 'oak'
  | 'birch'
  | 'pine'
  | 'elm'
  | 'autumn'
  | 'round_oak'
  | 'banana'
  | 'savannah'
  | 'cypress'
  | 'nordic_pine'
  | 'palm'
  | 'coconut'
  | 'tiered_pine'
  | 'baobab'
  | 'ancient'
  | 'platformer_pine'
  | 'round_snow'
  | 'pine_snow';

export type DailyQuestId =
  | 'q_focus_1'
  | 'q_minutes_45'
  | 'q_builder_1'
  | 'q_flow_30'
  | 'q_nature_care'
  | 'q_fauna_friend'
  | 'q_dawn_focus'
  | 'q_evening_calm'
  | 'q_tag_explorer';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface TodoItem {
  id: string;
  text: string;
  tag?: FocusTag;
  completed: boolean;
  created_at: string; // ISO string
  completed_at?: string | null; // ISO string
}

export interface FocusSession {
  id: string;
  started_at: string; // ISO string
  expected_end_at: string; // ISO string
  completed_at: string | null; // ISO string
  status: FocusSessionStatus;
  rewarded: boolean;
  tag?: FocusTag;
  species?: TreeSpecies;
  strict_mode?: boolean;
  duration_minutes?: number;
  task_note?: string;
  todo_id?: string;
  is_stopwatch?: boolean;
}

export interface WorldObject {
  id: string;
  object_type: ObjectType;
  grid_x: number; // 0..9
  grid_y: number; // 0..9
  rotation: number; // radians
  status: ObjectStatus;
  created_at: string; // ISO string
  reclaimed_at: string | null; // ISO string
  scale?: number; // visual scale variation 0.9 - 1.3
  model_variant?: string; // variant name
  species?: TreeSpecies; // tree species if object_type === 'tree'
  task_note?: string; // memory of the task completed when this tree grew
  focus_tag?: FocusTag; // category of focus session
  focus_duration?: number; // minutes focused
}

export interface CurrencyLedgerEntry {
  id: string;
  currency: CurrencyType;
  amount: number;
  reason: string;
  reference_id: string;
  created_at: string; // ISO string
  severity?: 'warning' | 'info' | 'error';
  message?: string;
}

export interface ReclamationEvent {
  id: string;
  triggered_at: string; // ISO string
  inactivity_hours: number;
  objects_affected: string[]; // list of object ids
}

export type FaunaSpecies =
  | 'bee'
  | 'bird'
  | 'rabbit'
  | 'fox'
  | 'koala'
  | 'mystic_stag'
  | 'deer'
  | 'butterfly'
  | 'elephant'
  | 'tiger'
  | 'polar'
  | 'panda'
  | 'monkey'
  | 'lion'
  | 'hog'
  | 'giraffe'
  | 'fish'
  | 'cat'
  | 'beaver';

export interface FaunaConfig {
  id: FaunaSpecies;
  name: string;
  title: string;
  icon: string;
  description: string;
  unlockConditionText: string;
  greetingQuote: string;
  sleepQuote?: string;
  dailyReward: {
    gold: number;
    xp: number;
  };
}

export interface RimbaSaveData {
  version: 1;
  profile: Profile;
  world: World;
  focus_sessions: FocusSession[];
  world_objects: WorldObject[];
  currency_ledger: CurrencyLedgerEntry[];
  reclamation_events: ReclamationEvent[];
  todos?: TodoItem[];
  claimed_quests?: string[];
  animal_interactions?: Record<string, string>; // faunaSpecies -> lastGreetedDate 'YYYY-MM-DD'
  claimed_achievements?: string[];
  custom_tags?: CustomTagItem[];
  pioneer_completed_ids?: string[];
  pioneer_reward_claimed?: boolean;
  distraction_source?: string;
  streak_shields?: number;
  used_shield_dates?: string[];
  claimed_story_chapters?: string[];
}


