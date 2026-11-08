import { WorldObject } from '@/types/game';
import { GAME_CONFIG, STARTER_UNLOCKED_TILES } from './config';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

/**
 * Checks if coordinate is within 10x10 grid bounds [0..9].
 */
export function isValidCoord(grid_x: number, grid_y: number): boolean {
  return (
    Number.isInteger(grid_x) &&
    Number.isInteger(grid_y) &&
    grid_x >= 0 &&
    grid_x < GAME_CONFIG.grid.size &&
    grid_y >= 0 &&
    grid_y < GAME_CONFIG.grid.size
  );
}

/**
 * Checks whether a grid tile is currently occupied by any object.
 */
export function isTileOccupied(
  grid_x: number,
  grid_y: number,
  objects: WorldObject[]
): boolean {
  return objects.some(
    (obj) => obj.grid_x === grid_x && obj.grid_y === grid_y
  );
}

/**
 * Mathematical Heightfield Function: getTerrainElevation(x, z)
 */
export function getTerrainElevation(
  _x: number,
  _z: number
): { height: number; isRiver: boolean; isBank: boolean; bankFactor: number } {
  return {
    height: 0.0,
    isRiver: false,
    isBank: false,
    bankFactor: 0,
  };
}

/**
 * Converts logical grid coordinates (0..9, 0..9) to 3D world coordinates [x, y, z].
 */
export function gridToWorld(
  grid_x: number,
  grid_y: number,
  heightOffset = 0
): [number, number, number] {
  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;
  const x = (grid_x + offset) * tileSize;
  const z = (grid_y + offset) * tileSize;
  const elevation = getTerrainElevation(x, z).height;
  return [x, elevation + heightOffset, z];
}

/**
 * Converts 3D world coordinates [x, y, z] to nearest integer grid coordinates (0..9).
 */
export function worldToGrid(
  x: number,
  z: number
): { grid_x: number; grid_y: number } | null {
  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;

  const rawX = Math.round(x / tileSize - offset);
  const rawY = Math.round(z / tileSize - offset);

  if (isValidCoord(rawX, rawY)) {
    return { grid_x: rawX, grid_y: rawY };
  }
  return null;
}

/**
 * Resolves the active set of unlocked tiles for the world.
 */
export function getUnlockedTilesSet(
  world?: { unlocked_tiles?: string[] } | null,
  existingObjects?: WorldObject[]
): Set<string> {
  const set = new Set<string>();

  if (world?.unlocked_tiles && world.unlocked_tiles.length > 0) {
    world.unlocked_tiles.forEach((t) => set.add(t));
  } else {
    STARTER_UNLOCKED_TILES.forEach((t) => set.add(t));
  }

  if (existingObjects) {
    existingObjects.forEach((obj) => {
      set.add(`${obj.grid_x},${obj.grid_y}`);
    });
  }

  return set;
}

/**
 * Returns a deterministic sorted string signature of unlocked tiles.
 */
export function getUnlockedTilesSignature(
  world?: { unlocked_tiles?: string[] } | null,
  existingObjects?: WorldObject[]
): string {
  const set = getUnlockedTilesSet(world, existingObjects);
  return Array.from(set).sort().join('|');
}

/**
 * Checks if a specific tile is currently unlocked.
 */
export function isTileUnlocked(
  grid_x: number,
  grid_y: number,
  unlockedSet: Set<string>
): boolean {
  return unlockedSet.has(`${grid_x},${grid_y}`);
}

/**
 * Checks if a tile can be unlocked.
 */
export function canUnlockTile(
  grid_x: number,
  grid_y: number,
  unlockedSet: Set<string>
): boolean {
  if (!isValidCoord(grid_x, grid_y)) return false;
  if (unlockedSet.has(`${grid_x},${grid_y}`)) return false;

  const neighbors = [
    `${grid_x + 1},${grid_y}`,
    `${grid_x - 1},${grid_y}`,
    `${grid_x},${grid_y + 1}`,
    `${grid_x},${grid_y - 1}`,
  ];

  return neighbors.some((n) => unlockedSet.has(n));
}

/**
 * Returns all candidate tiles eligible for immediate expansion.
 */
export function getExpandableTiles(
  unlockedSet: Set<string>
): { grid_x: number; grid_y: number }[] {
  const candidates: { grid_x: number; grid_y: number }[] = [];
  const size = GAME_CONFIG.grid.size;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (canUnlockTile(x, y, unlockedSet)) {
        candidates.push({ grid_x: x, grid_y: y });
      }
    }
  }

  return candidates;
}

/**
 * Finds an unoccupied and UNLOCKED tile closest to the center (4.5, 4.5) to spawn the focus reward tree.
 */
export function findEmptyTileNearCenter(
  objects: WorldObject[] = [],
  unlockedTiles?: Set<string>
): { grid_x: number; grid_y: number } | null {
  const size = GAME_CONFIG.grid.size;
  const safeObjects = Array.isArray(objects)
    ? objects.filter((o) => o && typeof o.grid_x === 'number' && typeof o.grid_y === 'number')
    : [];
  const occupied = new Set(safeObjects.map((o) => `${o.grid_x},${o.grid_y}`));

  const centerX = (size - 1) / 2;
  const centerY = (size - 1) / 2;

  const candidates: { grid_x: number; grid_y: number; distSq: number }[] = [];

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const coordKey = `${x},${y}`;
      if (!occupied.has(coordKey)) {
        if (unlockedTiles && !unlockedTiles.has(coordKey)) {
          continue;
        }

        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy + Math.sin(x * 13 + y * 7) * 0.3;
        candidates.push({ grid_x: x, grid_y: y, distSq });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.distSq - b.distSq);
  return { grid_x: candidates[0].grid_x, grid_y: candidates[0].grid_y };
}

export interface LandFullState {
  isFull: boolean;
  unlockedCount: number;
  occupiedCount: number;
  freeCount: number;
  canExpand: boolean;
  nextExpansionCost: { gold: number } | null;
  isMaxExpansion: boolean;
}

export function getLandFullState(
  world?: { unlocked_tiles?: string[] } | null,
  objects: WorldObject[] = []
): LandFullState {
  const unlockedSet = getUnlockedTilesSet(world, objects);
  const activeObjects = (objects || []).filter(
    (o) => o && o.status !== 'reclaimed' && o.status !== 'marked_for_clearing'
  );
  const occupiedSet = new Set(activeObjects.map((o) => `${o.grid_x},${o.grid_y}`));

  let occupiedCount = 0;
  unlockedSet.forEach((tileKey) => {
    if (occupiedSet.has(tileKey)) {
      occupiedCount++;
    }
  });

  const unlockedCount = unlockedSet.size;
  const freeCount = Math.max(0, unlockedCount - occupiedCount);
  const isFull = freeCount === 0;
  const isMaxExpansion = unlockedCount >= 100;
  const expandableTiles = getExpandableTiles(unlockedSet);
  const canExpand = !isMaxExpansion && expandableTiles.length > 0;
  const zoneInfo = getLandExpansionZoneInfo(unlockedCount);

  return {
    isFull,
    unlockedCount,
    occupiedCount,
    freeCount,
    canExpand,
    nextExpansionCost: canExpand ? { gold: zoneInfo.nextTileCost } : null,
    isMaxExpansion,
  };
}

export interface LandExpansionZoneInfo {
  zoneNumber: 1 | 2 | 3;
  zoneName: string;
  shortZoneName: string;
  nextTileCost: number;
  unlockedCount: number;
  zoneStartTiles: number;
  zoneTargetTiles: number;
  zoneProgressRatio: number;
  milestoneRewardText: string;
}

/**
 * Kubbo-style Progressive Land Expansion Zone & Pricing Calculator (Bilingual ID/EN)
 */
export function getLandExpansionZoneInfo(
  unlockedCount: number,
  language?: 'id' | 'en'
): LandExpansionZoneInfo {
  const isEn = (language ?? usePreferencesStore.getState().language) === 'en';
  const count = Math.max(9, Math.min(100, unlockedCount));

  if (count < 25) {
    const ratio = Math.min(1, Math.max(0, (count - 9) / (25 - 9)));
    return {
      zoneNumber: 1,
      zoneName: isEn
        ? 'Zone 1: Pioneer Core (3×3 → 5×5)'
        : 'Zona 1: Inti Perintis (3×3 → 5×5)',
      shortZoneName: isEn ? 'Zone 1 • Pioneer Core' : 'Zona 1 • Inti Perintis',
      nextTileCost: 8,
      unlockedCount: count,
      zoneStartTiles: 9,
      zoneTargetTiles: 25,
      zoneProgressRatio: ratio,
      milestoneRewardText: isEn
        ? 'Target 25 Tiles: Unlocks River Valley Zone & Water Streams!'
        : 'Target 25 Petak: Membuka Zona Lembah Sungai & Aliran Air!',
    };
  }

  if (count < 49) {
    const ratio = Math.min(1, Math.max(0, (count - 25) / (49 - 25)));
    return {
      zoneNumber: 2,
      zoneName: isEn
        ? 'Zone 2: River Valley (5×5 → 7×7)'
        : 'Zona 2: Lembah Sungai (5×5 → 7×7)',
      shortZoneName: isEn ? 'Zone 2 • River Valley' : 'Zona 2 • Lembah Sungai',
      nextTileCost: 15,
      unlockedCount: count,
      zoneStartTiles: 25,
      zoneTargetTiles: 49,
      zoneProgressRatio: ratio,
      milestoneRewardText: isEn
        ? 'Target 49 Tiles: Unlocks Rimba Sovereign & Coastal Landmarks!'
        : 'Target 49 Petak: Membuka Zona Rimba Raya & Landmark Pesisir!',
    };
  }

  const ratio = Math.min(1, Math.max(0, (count - 49) / (100 - 49)));
  return {
    zoneNumber: 3,
    zoneName: isEn
      ? 'Zone 3: Rimba Sovereign (7×7 → 10×10)'
      : 'Zona 3: Rimba Raya (7×7 → 10×10)',
    shortZoneName: isEn ? 'Zone 3 • Rimba Sovereign' : 'Zona 3 • Rimba Raya',
    nextTileCost: 25,
    unlockedCount: count,
    zoneStartTiles: 49,
    zoneTargetTiles: 100,
    zoneProgressRatio: ratio,
    milestoneRewardText:
      count >= 100
        ? isEn
          ? 'Full 10×10 Sovereignty (100 Tiles) Achieved!'
          : 'Kedaulatan Penuh 10×10 (100 Petak) Tercapai!'
        : isEn
          ? 'Target 100 Tiles: Full 10×10 Island Sovereignty!'
          : 'Target 100 Petak: Kedaulatan Penuh Pulau 10×10!',
  };
}

/**
 * Picks an outer unlocked perimeter tile (furthest from center) to be threatened/sealed by the Inactivity Bulldozer.
 */
export function getOuterUnlockedTileForBulldozer(
  unlockedSet: Set<string>,
  sealedTiles: string[] = []
): string | null {
  const sealedSet = new Set(sealedTiles);
  const centerX = 4.5;
  const centerY = 4.5;

  const candidates: { key: string; distSq: number }[] = [];
  unlockedSet.forEach((key) => {
    if (sealedSet.has(key)) return;
    const [gx, gy] = key.split(',').map(Number);
    if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;
    const dx = gx - centerX;
    const dy = gy - centerY;
    candidates.push({ key, distSq: dx * dx + dy * dy });
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.distSq - a.distSq);
  return candidates[0].key;
}
