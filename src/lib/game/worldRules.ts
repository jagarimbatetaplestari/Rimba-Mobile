import { WorldObject } from '@/types/game';
import { GAME_CONFIG, STARTER_UNLOCKED_TILES } from './config';

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
 * Calculates gentle, organic rolling meadow heights (+0.02m to +0.12m).
 * Zero sunken trenches; full continuous lawn across the 10x10 garden.
 */
export function getTerrainElevation(
  x: number,
  z: number
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
 * Y elevation is dynamically sampled from getTerrainElevation so objects sit naturally on terrain.
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
/**
 * Resolves the active set of unlocked tiles for the world.
 * Defaults to the 3x3 starter hub at center, plus any tile that already holds an object.
 */
export function getUnlockedTilesSet(
  world?: { unlocked_tiles?: string[] } | null,
  existingObjects?: WorldObject[]
): Set<string> {
  const set = new Set<string>();

  if (world?.unlocked_tiles && world.unlocked_tiles.length > 0) {
    world.unlocked_tiles.forEach((t) => set.add(t));
  } else {
    // Default to the 3x3 starter hub at center
    STARTER_UNLOCKED_TILES.forEach((t) => set.add(t));
  }

  // Ensure any tile that already contains an active/reclaimed object is never locked
  if (existingObjects) {
    existingObjects.forEach((obj) => {
      set.add(`${obj.grid_x},${obj.grid_y}`);
    });
  }

  return set;
}

/**
 * Returns a deterministic sorted string signature of unlocked tiles.
 * Used as a stable React useMemo dependency so placing/moving objects does not rebuild 3D terrain or grass.
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
 * Checks if a tile can be unlocked:
 * 1. Must be within 10x10 bounds (0..9).
 * 2. Must not already be unlocked.
 * 3. Must be strictly 4-way adjacent (North, South, East, West) to at least one unlocked tile.
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
 * Searches spirally / radially outward.
 */
export function findEmptyTileNearCenter(
  objects: WorldObject[],
  unlockedTiles?: Set<string>
): { grid_x: number; grid_y: number } | null {
  const size = GAME_CONFIG.grid.size;
  const occupied = new Set(objects.map((o) => `${o.grid_x},${o.grid_y}`));

  // Generate list of all grid coords sorted by distance to center (4.5, 4.5)
  const centerX = (size - 1) / 2;
  const centerY = (size - 1) / 2;

  const candidates: { grid_x: number; grid_y: number; distSq: number }[] = [];

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const coordKey = `${x},${y}`;
      if (!occupied.has(coordKey)) {
        // If an unlocked set is provided, only allow unlocked tiles
        if (unlockedTiles && !unlockedTiles.has(coordKey)) {
          continue;
        }

        const dx = x - centerX;
        const dy = y - centerY;
        // Add a slight pseudo-random jitter so trees don't always take identical slots
        const distSq = dx * dx + dy * dy + (Math.sin(x * 13 + y * 7) * 0.3);
        candidates.push({ grid_x: x, grid_y: y, distSq });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.distSq - b.distSq);
  return { grid_x: candidates[0].grid_x, grid_y: candidates[0].grid_y };
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
 * Kubbo-style Progressive Land Expansion Zone & Pricing Calculator:
 * - Zone 1 (9 -> 25 tiles / 3x3 to 5x5): 8 Gold/tile — Starter Core (Sebelumnya 25)
 * - Zone 2 (25 -> 49 tiles / 5x5 to 7x7): 15 Gold/tile — River Valley & Bridges (Sebelumnya 40)
 * - Zone 3 (49 -> 100 tiles / 7x7 to 10x10): 25 Gold/tile — Grand Rimba Sovereign (Sebelumnya 60)
 */
export function getLandExpansionZoneInfo(unlockedCount: number): LandExpansionZoneInfo {
  const count = Math.max(9, Math.min(100, unlockedCount));

  if (count < 25) {
    const ratio = Math.min(1, Math.max(0, (count - 9) / (25 - 9)));
    return {
      zoneNumber: 1,
      zoneName: 'Zona 1: Inti Perintis (3×3 → 5×5)',
      shortZoneName: 'Zona 1 • Inti Perintis',
      nextTileCost: 8,
      unlockedCount: count,
      zoneStartTiles: 9,
      zoneTargetTiles: 25,
      zoneProgressRatio: ratio,
      milestoneRewardText: 'Target 25 Petak: Membuka Zona Lembah Sungai & Aliran Air!',
    };
  }

  if (count < 49) {
    const ratio = Math.min(1, Math.max(0, (count - 25) / (49 - 25)));
    return {
      zoneNumber: 2,
      zoneName: 'Zona 2: Lembah Sungai (5×5 → 7×7)',
      shortZoneName: 'Zona 2 • Lembah Sungai',
      nextTileCost: 15,
      unlockedCount: count,
      zoneStartTiles: 25,
      zoneTargetTiles: 49,
      zoneProgressRatio: ratio,
      milestoneRewardText: 'Target 49 Petak: Membuka Zona Rimba Raya & Landmark Pesisir!',
    };
  }

  const ratio = Math.min(1, Math.max(0, (count - 49) / (100 - 49)));
  return {
    zoneNumber: 3,
    zoneName: 'Zona 3: Rimba Raya (7×7 → 10×10)',
    shortZoneName: 'Zona 3 • Rimba Raya',
    nextTileCost: 25,
    unlockedCount: count,
    zoneStartTiles: 49,
    zoneTargetTiles: 100,
    zoneProgressRatio: ratio,
    milestoneRewardText:
      count >= 100
        ? 'Kedaulatan Penuh 10×10 (100 Petak) Tercapai! 👑'
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

