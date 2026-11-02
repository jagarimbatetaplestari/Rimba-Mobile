import type { IslandSlot, RimbaSaveData } from '@/types/game';

type NamedIsland = Pick<IslandSlot, 'name' | 'name_source'>;

export function getIslandDisplayName(island: NamedIsland, language: 'en' | 'id', rangerName?: string): string {
  const { name } = island;
  if (island.name_source === 'custom') return name;

  // Old saves have no provenance. Recognize only the app's exact default formats,
  // never translate an arbitrary user-written "Suaka ..." name.
  if (name === 'Suaka Utama' || name === 'Main Sanctuary') {
    return language === 'en' ? 'Main Sanctuary' : 'Suaka Utama';
  }
  if (name === 'Suaka Rimba' || name === 'Rimba Sanctuary') {
    return language === 'en' ? 'Rimba Sanctuary' : 'Suaka Rimba';
  }
  if (name === 'My Rimba' || name === 'Rimba Saya') {
    return language === 'en' ? 'My Rimba' : 'Rimba Saya';
  }
  const numbered = /^(?:Suaka|Sanctuary) ([1-9]\d*)$/.exec(name);
  if (numbered) return `${language === 'en' ? 'Sanctuary' : 'Suaka'} ${numbered[1]}`;

  const ranger = rangerName?.trim();
  if (ranger && (name === `Suaka ${ranger}` || name === `${ranger}’s Sanctuary` || name === `${ranger}'s Sanctuary`)) {
    return language === 'en' ? `${ranger}’s Sanctuary` : `Suaka ${ranger}`;
  }
  return name;
}

export function getWorldDisplayName(saveData: RimbaSaveData, language: 'en' | 'id'): string {
  const activeIsland = saveData.islands?.find(island => island.id === saveData.active_island_id);
  return getIslandDisplayName({
    name: saveData.world.name,
    name_source: activeIsland?.name === saveData.world.name ? activeIsland.name_source : undefined,
  }, language, saveData.profile.name);
}
