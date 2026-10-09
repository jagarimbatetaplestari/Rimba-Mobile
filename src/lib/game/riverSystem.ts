import * as THREE from 'three';
import { WorldObject } from '@/types/game';

export interface RiverAdjacency {
  north: boolean; // (gx, gy - 1)
  south: boolean; // (gx, gy + 1)
  west: boolean;  // (gx - 1, gy)
  east: boolean;  // (gx + 1, gy)
  count: number;
  mask: number; // 0..15 bitmask: 1=N, 2=S, 4=W, 8=E
}

export function isRiverVariant(modelVariant?: string): boolean {
  return (modelVariant || '').toLowerCase().includes('river');
}

export function isBridgeVariant(modelVariant?: string): boolean {
  return (modelVariant || '').toLowerCase().includes('bridge');
}

export function isWaterConduit(modelVariant?: string): boolean {
  return isRiverVariant(modelVariant) || isBridgeVariant(modelVariant);
}

/**
 * Determines 4-way orthogonal connectivity for a river tile.
 * Also accounts for rivers flowing off the edge of the island into the sea/void.
 */
export function getRiverAdjacency(
  gx: number,
  gy: number,
  riverCoords: Set<string>,
  unlockedSet?: Set<string>
): RiverAdjacency {
  const rawN = riverCoords.has(`${gx},${gy - 1}`);
  const rawS = riverCoords.has(`${gx},${gy + 1}`);
  const rawW = riverCoords.has(`${gx - 1},${gy}`);
  const rawE = riverCoords.has(`${gx + 1},${gy}`);

  // If adjacent coordinate is beyond the unlocked island boundary, and opposite side is river:
  // Allow water to flow out to the cliff edge like a natural river mouth / waterfall.
  const isCliff = (nx: number, ny: number) => Boolean(unlockedSet && !unlockedSet.has(`${nx},${ny}`));

  const westCliffFlow = rawW || (rawE && isCliff(gx - 1, gy));
  const eastCliffFlow = rawE || (rawW && isCliff(gx + 1, gy));
  const northCliffFlow = rawN || (rawS && isCliff(gx, gy - 1));
  const southCliffFlow = rawS || (rawN && isCliff(gx, gy + 1));

  const north = northCliffFlow;
  const south = southCliffFlow;
  const west = westCliffFlow;
  const east = eastCliffFlow;

  const count = (north ? 1 : 0) + (south ? 1 : 0) + (west ? 1 : 0) + (east ? 1 : 0);
  const mask = (north ? 1 : 0) | (south ? 2 : 0) | (west ? 4 : 0) | (east ? 8 : 0);

  return { north, south, west, east, count, mask };
}

/**
 * Builds a fast lookup map of RiverAdjacency for all water conduit tiles in the world.
 */
export function buildRiverTileMap(
  worldObjects: WorldObject[],
  unlockedSet?: Set<string>
): Map<string, RiverAdjacency> {
  const map = new Map<string, RiverAdjacency>();
  const riverCoords = new Set<string>();

  for (const obj of worldObjects) {
    if (obj.status !== 'marked_for_clearing' && isWaterConduit(obj.model_variant)) {
      riverCoords.add(`${obj.grid_x},${obj.grid_y}`);
    }
  }

  riverCoords.forEach((key) => {
    const [gx, gy] = key.split(',').map(Number);
    if (Number.isInteger(gx) && Number.isInteger(gy)) {
      map.set(key, getRiverAdjacency(gx, gy, riverCoords, unlockedSet));
    }
  });

  return map;
}

/**
 * Computes shortest distance from point (px, pz) to 2D line segment (ax, az)-(bx, bz).
 */
function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const l2 = (bx - ax) * (bx - ax) + (bz - az) * (bz - az);
  if (l2 === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * (bx - ax)), pz - (az + t * (bz - az)));
}

/**
 * Continuous distance function for sculpting terrain in Island.tsx.
 * dx, dz in [-0.5, 0.5] relative to tile center.
 * Returns orthogonal distance to active river channel centerlines.
 */
export function getRiverChannelDistance(
  dx: number,
  dz: number,
  adj: RiverAdjacency
): number {
  if (adj.count === 0) {
    return Math.hypot(dx, dz);
  }

  // Fast paths for straight lines:
  if (adj.west && adj.east && !adj.north && !adj.south) {
    return Math.abs(dz);
  }
  if (adj.north && adj.south && !adj.west && !adj.east) {
    return Math.abs(dx);
  }

  let minDist = 999;
  if (adj.north) minDist = Math.min(minDist, distToSegment(dx, dz, 0, 0, 0, -0.5));
  if (adj.south) minDist = Math.min(minDist, distToSegment(dx, dz, 0, 0, 0, 0.5));
  if (adj.west)  minDist = Math.min(minDist, distToSegment(dx, dz, 0, 0, -0.5, 0));
  if (adj.east)  minDist = Math.min(minDist, distToSegment(dx, dz, 0, 0, 0.5, 0));

  // Corner / Junction diagonal fills so wide rivers and turns have 100% continuous water with zero holes
  if (adj.east && adj.south && dx >= 0 && dz >= 0) {
    minDist = Math.min(minDist, Math.max(0, Math.hypot(dx - 0.5, dz - 0.5) - 0.5));
  }
  if (adj.west && adj.south && dx <= 0 && dz >= 0) {
    minDist = Math.min(minDist, Math.max(0, Math.hypot(dx + 0.5, dz - 0.5) - 0.5));
  }
  if (adj.east && adj.north && dx >= 0 && dz <= 0) {
    minDist = Math.min(minDist, Math.max(0, Math.hypot(dx - 0.5, dz + 0.5) - 0.5));
  }
  if (adj.west && adj.north && dx <= 0 && dz <= 0) {
    minDist = Math.min(minDist, Math.max(0, Math.hypot(dx + 0.5, dz + 0.5) - 0.5));
  }

  return minDist;
}

// Geometry caches: instantiated once per mask (0..15) and reused globally
const waterGeoCache = new Map<number, THREE.BufferGeometry>();
const shoreGeoCache = new Map<number, THREE.BufferGeometry | null>();

/**
 * Generates or retrieves the seamless, continuous water mesh for a tile bitmask.
 * Extends by 0.50m on connected sides to ensure zero hairline seams between adjacent tiles.
 */
export function getRiverWaterGeometry(mask: number): THREE.BufferGeometry {
  const cached = waterGeoCache.get(mask);
  if (cached) return cached;

  const n = Boolean(mask & 1);
  const s = Boolean(mask & 2);
  const w = Boolean(mask & 4);
  const e = Boolean(mask & 8);
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0) + (e ? 1 : 0);

  const hw = 0.38;       // Half-width of river water channel (0.76m wide)
  const ext = 0.50;      // Exactly 0.50m (half of 1.0m tile) so adjacent tiles touch with zero overlap and zero gap
  const y = 0.0;         // Water surface elevation relative to group center

  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function addQuad(x0: number, z0: number, x1: number, z1: number) {
    const base = verts.length / 3;
    verts.push(x0, y, z0,  x1, y, z0,  x1, y, z1,  x0, y, z1);
    uvs.push(x0 + 0.5, z0 + 0.5,  x1 + 0.5, z0 + 0.5,  x1 + 0.5, z1 + 0.5,  x0 + 0.5, z1 + 0.5);
    // Counter-clockwise from above so normals point straight up (+Y)
    indices.push(base, base + 2, base + 1,  base, base + 3, base + 2);
  }

  function addFan(cx: number, cz: number, r: number, startA: number, endA: number, segs = 16) {
    const base = verts.length / 3;
    verts.push(cx, y, cz);
    uvs.push(cx + 0.5, cz + 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = startA + (i / segs) * (endA - startA);
      const vx = cx + Math.cos(a) * r;
      const vz = cz + Math.sin(a) * r;
      verts.push(vx, y, vz);
      uvs.push(vx + 0.5, vz + 0.5);
    }
    for (let i = 1; i <= segs; i++) {
      indices.push(base, base + i + 1, base + i);
    }
  }

  function addCurvedArcStrip(
    cx: number,
    cz: number,
    rInner: number,
    rOuter: number,
    startAngle: number,
    endAngle: number,
    segs = 16
  ) {
    const base = verts.length / 3;
    for (let i = 0; i <= segs; i++) {
      const prog = i / segs;
      const angle = startAngle + prog * (endAngle - startAngle);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Inner vertex
      const xIn = cx + cosA * rInner;
      const zIn = cz + sinA * rInner;
      verts.push(xIn, y, zIn);
      uvs.push(xIn + 0.5, zIn + 0.5);

      // Outer vertex
      const xOut = cx + cosA * rOuter;
      const zOut = cz + sinA * rOuter;
      verts.push(xOut, y, zOut);
      uvs.push(xOut + 0.5, zOut + 0.5);
    }

    for (let i = 0; i < segs; i++) {
      const idx = base + i * 2;
      indices.push(idx, idx + 1, idx + 3);
      indices.push(idx, idx + 3, idx + 2);
    }
  }

  if (count === 0) {
    // Isolated pond disk - full rounded pond with zero raw edge holes
    addFan(0, 0, 0.46, 0, Math.PI * 2, 24);
  } else if (count === 1) {
    // River spring/source or mouth: straight channel from tile border to center + clean semicircular spring
    if (e) {
      addQuad(0, -hw, ext, hw);
      addFan(0, 0, hw, Math.PI * 0.5, Math.PI * 1.5, 16);
    } else if (w) {
      addQuad(-ext, -hw, 0, hw);
      addFan(0, 0, hw, -Math.PI * 0.5, Math.PI * 0.5, 16);
    } else if (n) {
      addQuad(-hw, -ext, hw, 0);
      addFan(0, 0, hw, 0, Math.PI, 16);
    } else if (s) {
      addQuad(-hw, 0, hw, ext);
      addFan(0, 0, hw, Math.PI, Math.PI * 2, 16);
    }
  } else if (count === 2 && w && e) {
    // Pure straight West-East: single contiguous quad spanning the entire tile with ZERO internal seams
    addQuad(-ext, -hw, ext, hw);
  } else if (count === 2 && n && s) {
    // Pure straight North-South: single contiguous quad spanning the entire tile with ZERO internal seams
    addQuad(-hw, -ext, hw, ext);
  } else if (count === 2 && s && e) {
    // Organic curved bend: South to East
    addCurvedArcStrip(ext, ext, ext - hw, ext + hw, Math.PI, 1.5 * Math.PI, 20);
  } else if (count === 2 && s && w) {
    // Organic curved bend: South to West
    addCurvedArcStrip(-ext, ext, ext - hw, ext + hw, 1.5 * Math.PI, 2.0 * Math.PI, 20);
  } else if (count === 2 && n && e) {
    // Organic curved bend: North to East
    addCurvedArcStrip(ext, -ext, ext - hw, ext + hw, 0.5 * Math.PI, Math.PI, 20);
  } else if (count === 2 && n && w) {
    // Organic curved bend: North to West
    addCurvedArcStrip(-ext, -ext, ext - hw, ext + hw, 0.0, 0.5 * Math.PI, 20);
  } else {
    // T-junctions and 4-way cross: Central hub + connected arms + smooth corner fillets
    addQuad(-hw, -hw, hw, hw);

    // Channel arms reaching precisely to tile edge (±0.50m)
    if (e) addQuad(hw, -hw, ext, hw);
    if (w) addQuad(-ext, -hw, -hw, hw);
    if (n) addQuad(-hw, -ext, hw, -hw);
    if (s) addQuad(-hw, hw, hw, ext);

    // Fill inner corners of active junctions so water never has corner holes
    if (e && s) addCurvedArcStrip(ext, ext, ext - hw, ext + hw, Math.PI, 1.5 * Math.PI, 16);
    if (w && s) addCurvedArcStrip(-ext, ext, ext - hw, ext + hw, 1.5 * Math.PI, 2.0 * Math.PI, 16);
    if (e && n) addCurvedArcStrip(ext, -ext, ext - hw, ext + hw, 0.5 * Math.PI, Math.PI, 16);
    if (w && n) addCurvedArcStrip(-ext, -ext, ext - hw, ext + hw, 0.0, 0.5 * Math.PI, 16);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  waterGeoCache.set(mask, geo);
  return geo;
}

const bedGeoCache = new Map<number, THREE.BufferGeometry>();

/**
 * Generates or retrieves the seamless sandy riverbed cradle mesh for a tile bitmask.
 * Uses a slightly wider channel (hw = 0.43m) so golden sandy shores naturally cradle the turquoise water.
 */
export function getRiverBedGeometry(mask: number): THREE.BufferGeometry {
  const cached = bedGeoCache.get(mask);
  if (cached) return cached;

  const n = Boolean(mask & 1);
  const s = Boolean(mask & 2);
  const w = Boolean(mask & 4);
  const e = Boolean(mask & 8);
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0) + (e ? 1 : 0);

  const hw = 0.43;       // Half-width of riverbed canal (0.86m wide)
  const ext = 0.505;     // Extends slightly past 0.50m so adjacent tiles connect with zero gap
  const y = 0.0;

  const verts: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function addQuad(x0: number, z0: number, x1: number, z1: number) {
    const base = verts.length / 3;
    verts.push(x0, y, z0,  x1, y, z0,  x1, y, z1,  x0, y, z1);
    uvs.push(x0 + 0.5, z0 + 0.5,  x1 + 0.5, z0 + 0.5,  x1 + 0.5, z1 + 0.5,  x0 + 0.5, z1 + 0.5);
    indices.push(base, base + 2, base + 1,  base, base + 3, base + 2);
  }

  function addFan(cx: number, cz: number, r: number, startA: number, endA: number, segs = 16) {
    const base = verts.length / 3;
    verts.push(cx, y, cz);
    uvs.push(cx + 0.5, cz + 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = startA + (i / segs) * (endA - startA);
      const vx = cx + Math.cos(a) * r;
      const vz = cz + Math.sin(a) * r;
      verts.push(vx, y, vz);
      uvs.push(vx + 0.5, vz + 0.5);
    }
    for (let i = 1; i <= segs; i++) {
      indices.push(base, base + i + 1, base + i);
    }
  }

  function addCurvedArcStrip(
    cx: number,
    cz: number,
    rInner: number,
    rOuter: number,
    startAngle: number,
    endAngle: number,
    segs = 16
  ) {
    const base = verts.length / 3;
    for (let i = 0; i <= segs; i++) {
      const prog = i / segs;
      const angle = startAngle + prog * (endAngle - startAngle);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Inner vertex
      const xIn = cx + cosA * rInner;
      const zIn = cz + sinA * rInner;
      verts.push(xIn, y, zIn);
      uvs.push(xIn + 0.5, zIn + 0.5);

      // Outer vertex
      const xOut = cx + cosA * rOuter;
      const zOut = cz + sinA * rOuter;
      verts.push(xOut, y, zOut);
      uvs.push(xOut + 0.5, zOut + 0.5);
    }

    for (let i = 0; i < segs; i++) {
      const idx = base + i * 2;
      indices.push(idx, idx + 1, idx + 3);
      indices.push(idx, idx + 3, idx + 2);
    }
  }

  if (count === 0) {
    addFan(0, 0, 0.48, 0, Math.PI * 2, 24);
  } else if (count === 1) {
    if (e) {
      addQuad(0, -hw, ext, hw);
      addFan(0, 0, hw, Math.PI * 0.5, Math.PI * 1.5, 16);
    } else if (w) {
      addQuad(-ext, -hw, 0, hw);
      addFan(0, 0, hw, -Math.PI * 0.5, Math.PI * 0.5, 16);
    } else if (n) {
      addQuad(-hw, -ext, hw, 0);
      addFan(0, 0, hw, 0, Math.PI, 16);
    } else if (s) {
      addQuad(-hw, 0, hw, ext);
      addFan(0, 0, hw, Math.PI, Math.PI * 2, 16);
    }
  } else if (count === 2 && w && e) {
    addQuad(-ext, -hw, ext, hw);
  } else if (count === 2 && n && s) {
    addQuad(-hw, -ext, hw, ext);
  } else if (count === 2 && s && e) {
    addCurvedArcStrip(ext, ext, Math.max(0.01, ext - hw), ext + hw, Math.PI, 1.5 * Math.PI, 20);
  } else if (count === 2 && s && w) {
    addCurvedArcStrip(-ext, ext, Math.max(0.01, ext - hw), ext + hw, 1.5 * Math.PI, 2.0 * Math.PI, 20);
  } else if (count === 2 && n && e) {
    addCurvedArcStrip(ext, -ext, Math.max(0.01, ext - hw), ext + hw, 0.5 * Math.PI, Math.PI, 20);
  } else if (count === 2 && n && w) {
    addCurvedArcStrip(-ext, -ext, Math.max(0.01, ext - hw), ext + hw, 0.0, 0.5 * Math.PI, 20);
  } else {
    addQuad(-hw, -hw, hw, hw);
    if (e) addQuad(hw, -hw, ext, hw);
    if (w) addQuad(-ext, -hw, -hw, hw);
    if (n) addQuad(-hw, -ext, hw, -hw);
    if (s) addQuad(-hw, hw, hw, ext);
    if (e && s) addCurvedArcStrip(ext, ext, Math.max(0.01, ext - hw), ext + hw, Math.PI, 1.5 * Math.PI, 16);
    if (w && s) addCurvedArcStrip(-ext, ext, Math.max(0.01, ext - hw), ext + hw, 1.5 * Math.PI, 2.0 * Math.PI, 16);
    if (e && n) addCurvedArcStrip(ext, -ext, Math.max(0.01, ext - hw), ext + hw, 0.5 * Math.PI, Math.PI, 16);
    if (w && n) addCurvedArcStrip(-ext, -ext, Math.max(0.01, ext - hw), ext + hw, 0.0, 0.5 * Math.PI, 16);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  bedGeoCache.set(mask, geo);
  return geo;
}

/**
 * Shore banks are sculpted smoothly by Island.tsx with high-subdivision diorama terrain.
 * Redundant flat shore meshes are disabled to ensure zero clipping or z-fighting.
 */
export function getRiverShoreGeometry(_mask: number): THREE.BufferGeometry | null {
  return null;
}

export interface RiverPebbleData {
  pos: [number, number, number];
  scale: [number, number, number];
  rot: number;
}

/**
 * Returns deterministic decorative low-poly pebble positions along UNCONNECTED shores.
 * Disabled to ensure clean crystal-clear river surfaces matching Reference 2.
 */
export function getRiverPebbles(_mask: number): RiverPebbleData[] {
  return [];
}

/**
 * Decomposes all water conduit tiles into connected river networks and generates
 * continuous, strictly-adjacent patrol waypoints (distance between step i and i+1 is strictly 1 tile).
 * This completely prevents fish from jumping across dry land or between disconnected river bodies.
 */
export function getConnectedRiverPatrolPaths(
  riverTileMap: Map<string, RiverAdjacency>
): [number, number, number][][] {
  if (riverTileMap.size === 0) return [];

  const allKeys = Array.from(riverTileMap.keys());
  const visitedGlobal = new Set<string>();
  const clusters: string[][] = [];

  for (const startKey of allKeys) {
    if (visitedGlobal.has(startKey)) continue;

    const cluster: string[] = [];
    const queue = [startKey];
    visitedGlobal.add(startKey);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      cluster.push(curr);
      const [gx, gy] = curr.split(',').map(Number);
      const neighbors = [
        `${gx},${gy - 1}`,
        `${gx},${gy + 1}`,
        `${gx - 1},${gy}`,
        `${gx + 1},${gy}`,
      ];

      for (const nKey of neighbors) {
        if (riverTileMap.has(nKey) && !visitedGlobal.has(nKey)) {
          visitedGlobal.add(nKey);
          queue.push(nKey);
        }
      }
    }

    clusters.push(cluster);
  }

  // For each cluster, build a continuous patrol path
  const patrolPaths: [number, number, number][][] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      const [gx, gy] = cluster[0].split(',').map(Number);
      patrolPaths.push([[gx, 0, gy]]);
      continue;
    }

    const clusterSet = new Set(cluster);
    const visitedDfs = new Set<string>();
    const patrolKeys: string[] = [];

    const getNeighbors = (key: string): string[] => {
      const [gx, gy] = key.split(',').map(Number);
      return [
        `${gx + 1},${gy}`,
        `${gx},${gy + 1}`,
        `${gx - 1},${gy}`,
        `${gx},${gy - 1}`,
      ].filter((n) => clusterSet.has(n));
    };

    const dfs = (node: string) => {
      visitedDfs.add(node);
      patrolKeys.push(node);
      const nbrs = getNeighbors(node);
      for (const nxt of nbrs) {
        if (!visitedDfs.has(nxt)) {
          dfs(nxt);
          patrolKeys.push(node); // Backtrack step ensures step from nxt to node is adjacent!
        }
      }
    };

    dfs(cluster[0]);

    // If DFS returned back to the start node, pop the redundant duplicate so wrapping from end to start is strictly adjacent
    if (patrolKeys.length > 2 && patrolKeys[patrolKeys.length - 1] === patrolKeys[0]) {
      patrolKeys.pop();
    }

    const coords: [number, number, number][] = patrolKeys.map((k) => {
      const [gx, gy] = k.split(',').map(Number);
      return [gx, 0, gy];
    });

    patrolPaths.push(coords);
  }

  return patrolPaths;
}
