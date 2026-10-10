import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game/useGameStore';
import {
  getUnlockedTilesSignature,
} from '@/lib/game/worldRules';
import { GAME_CONFIG } from '@/lib/game/config';
import { RisingLandBlock } from './RisingLandBlock';
import { buildRiverTileMap } from '@/lib/game/riverSystem';

// Preload Kenney Platformer Kit modular block models
useGLTF.preload('/models/block-grass-low.glb');
useGLTF.preload('/models/block-grass-overhang-low.glb');
useGLTF.preload('/models/block-grass-corner-overhang-low.glb');
useGLTF.preload('/models/block-snow-low.glb');
useGLTF.preload('/models/block-snow-overhang-low.glb');
useGLTF.preload('/models/block-snow-corner-overhang-low.glb');

interface InstanceData {
  pos: [number, number, number];
  rotY: number;
  scale?: [number, number, number];
}

/**
 * High-performance InstancedMesh renderer for modular Kenney terrain blocks
 * Renders hundreds of tiles in a single draw call with cast/receive shadows!
 */
function ModularBlockInstances({
  modelUrl,
  instances,
}: {
  modelUrl: string;
  instances: InstanceData[];
}) {
  const { scene } = useGLTF(modelUrl);
  const mesh = scene.children[0] as THREE.Mesh;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!instRef.current || instances.length === 0) return;
    for (let i = 0; i < instances.length; i++) {
      const item = instances[i];
      dummy.position.set(item.pos[0], item.pos[1], item.pos[2]);
      dummy.rotation.set(0, item.rotY, 0);
      const s = item.scale || [1.0, 1.0, 1.0];
      dummy.scale.set(s[0], s[1], s[2]);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [instances, dummy]);

  if (instances.length === 0 || !mesh) return null;

  return (
    <instancedMesh
      ref={instRef}
      args={[mesh.geometry, mesh.material, instances.length]}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Seamless unified lawn turf overlay:
 * Bridges all tile boundaries and completely seals corner bevel cavities ("padet dan menyatu"),
 * creating a dense, solid, unified ground surface across the sanctuary island!
 */
function SeamlessTurfOverlay({
  positions,
  activeBiome,
}: {
  positions: [number, number, number][];
  activeBiome: 'meadow' | 'snow';
}) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(1.025, 1.025), []);
  const isSnow = activeBiome === 'snow';

  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSnow ? '#F8F8FB' : '#5AC487', // Exact Kenney top color matching colormap.png
      roughness: 0.88,
      metalness: 0.0,
    });
  }, [isSnow]);

  useEffect(() => {
    if (!instRef.current || positions.length === 0) return;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={instRef}
      args={[geo, mat, positions.length]}
      receiveShadow
    />
  );
}

/**
 * Solid under-island bedrock & fertile earth foundation:
 * Seals all under-cliff gaps, preventing any background sky or void from showing through.
 */
function BedrockBaseInstances({
  positions,
  activeBiome,
}: {
  positions: [number, number, number][];
  activeBiome: 'meadow' | 'snow';
}) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.BoxGeometry(1.005, 0.46, 1.005), []);
  const isSnow = activeBiome === 'snow';

  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSnow ? '#5A5868' : '#322116', // Dark rich soil foundation
      roughness: 0.95,
      metalness: 0.0,
    });
  }, [isSnow]);

  useEffect(() => {
    if (!instRef.current || positions.length === 0) return;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      dummy.position.set(pos[0], -0.48, pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={instRef}
      args={[geo, mat, positions.length]}
      receiveShadow
    />
  );
}

/**
 * Junction Seal Overlay:
 * Placed at all grid intersections where 2 or more unlocked land blocks meet.
 * Completely covers and seals the chamfer diagonal diamond crevices between blocks!
 */
function JunctionSealOverlay({
  positions,
  activeBiome,
}: {
  positions: [number, number, number][];
  activeBiome: 'meadow' | 'snow';
}) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.CircleGeometry(0.20, 16), []);
  const isSnow = activeBiome === 'snow';

  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSnow ? '#F8F8FB' : '#5AC487',
      roughness: 0.88,
      metalness: 0.0,
    });
  }, [isSnow]);

  useEffect(() => {
    if (!instRef.current || positions.length === 0) return;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={instRef}
      args={[geo, mat, positions.length]}
      receiveShadow
    />
  );
}

/**
 * Dynamic Modular Diorama Island:
 * Renders bright, vibrant modular Kenney Platformer Kit land blocks
 * with smart overhang perimeter edge & corner styling, plus Level 20 Snow Biome!
 */
export function Island() {
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const activeBiome = useGameStore((state) => state.activeBiome || 'meadow');

  const unlockedSignature = useMemo(
    () => getUnlockedTilesSignature(world, worldObjects),
    [world, worldObjects]
  );

  const unlockedSet = useMemo(() => {
    return new Set(unlockedSignature ? unlockedSignature.split('|') : []);
  }, [unlockedSignature]);

  const [risingTiles, setRisingTiles] = useState<Set<string>>(new Set());
  const initialMountRef = useRef(true);

  // When a new land tile is unlocked in this session, trigger its spring rise animation
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (world.last_expanded_tile) {
      setRisingTiles((prev) => {
        const next = new Set(prev);
        next.add(world.last_expanded_tile!);
        return next;
      });
    }
  }, [world.last_expanded_tile]);

  const handleTileSettled = (coordKey: string) => {
    setRisingTiles((prev) => {
      const next = new Set(prev);
      next.delete(coordKey);
      return next;
    });
  };

  // Static meadow and walls exclude any tile actively performing its rising animation
  const staticUnlockedSet = useMemo(() => {
    if (risingTiles.size === 0) return unlockedSet;
    const filtered = new Set<string>();
    unlockedSet.forEach((key) => {
      if (!risingTiles.has(key)) filtered.add(key);
    });
    return filtered;
  }, [unlockedSet, risingTiles]);

  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;

  // Map tiles that contain a river stream or bridge
  const riverTileMap = useMemo(() => {
    return buildRiverTileMap(worldObjects, staticUnlockedSet);
  }, [worldObjects, staticUnlockedSet]);

  // Smart modular block classification: categorize tiles into interior, edge, and corner
  const {
    interiorTiles,
    edgeTiles,
    cornerTiles,
    turfPositions,
    junctionSealPositions,
    bedrockPositions,
  } = useMemo(() => {
    const interiors: InstanceData[] = [];
    const edges: InstanceData[] = [];
    const corners: InstanceData[] = [];
    const turfs: [number, number, number][] = [];
    const bedrocks: [number, number, number][] = [];
    const junctionMap = new Map<string, { pos: [number, number, number]; count: number }>();

    staticUnlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;

      const cx = (gx + offset) * tileSize;
      const cz = (gy + offset) * tileSize;

      // Bedrock foundation under every unlocked tile
      bedrocks.push([cx, -0.48, cz]);

      // Collect 4 corner junctions for sealing chamfer crevices
      const tileCorners = [
        [gx + 0.5, gy + 0.5],
        [gx - 0.5, gy + 0.5],
        [gx - 0.5, gy - 0.5],
        [gx + 0.5, gy - 0.5],
      ];
      tileCorners.forEach(([jx, jy]) => {
        const jKey = `${jx},${jy}`;
        const existing = junctionMap.get(jKey);
        if (existing) {
          existing.count += 1;
        } else {
          const worldX = (jx + offset) * tileSize;
          const worldZ = (jy + offset) * tileSize;
          junctionMap.set(jKey, { pos: [worldX, 0.0015, worldZ], count: 1 });
        }
      });

      // Detect exposed exterior edges facing the ocean void
      const hasN = staticUnlockedSet.has(`${gx},${gy - 1}`);
      const hasS = staticUnlockedSet.has(`${gx},${gy + 1}`);
      const hasW = staticUnlockedSet.has(`${gx - 1},${gy}`);
      const hasE = staticUnlockedSet.has(`${gx + 1},${gy}`);

      const missingN = !hasN;
      const missingS = !hasS;
      const missingW = !hasW;
      const missingE = !hasE;
      const missingCount = (missingN ? 1 : 0) + (missingS ? 1 : 0) + (missingW ? 1 : 0) + (missingE ? 1 : 0);

      // Interior tiles get the seamless turf overlay plane
      if (!riverTileMap.has(key) && missingCount === 0) {
        turfs.push([cx, 0.001, cz]);
      }

      const blockPos: [number, number, number] = [cx, -0.5, cz];

      if (missingCount >= 3) {
        // Single protrusion tile or isolated island:
        // Has 3 or 4 open sides facing the ocean.
        // Use interiorModel (which has complete 4-sided rounded cliff overhangs).
        // This avoids sharp tapered corner wedges and exposed flat cuts!
        interiors.push({ pos: blockPos, rotY: 0, scale: [1.0, 1.0, 1.0] });
      } else if (missingCount === 2) {
        // If 2 opposite sides are missing (1-wide bridge or corridor):
        if ((missingN && missingS) || (missingW && missingE)) {
          // Opposite open sides: use interiorModel so both sides have grass cliffs!
          interiors.push({ pos: blockPos, rotY: 0, scale: [1.0, 1.0, 1.0] });
        } else {
          // True 90-degree corner facing the ocean
          if (missingS && missingE) {
            corners.push({ pos: blockPos, rotY: 0 });
          } else if (missingS && missingW) {
            corners.push({ pos: blockPos, rotY: Math.PI * 0.5 });
          } else if (missingN && missingW) {
            corners.push({ pos: blockPos, rotY: Math.PI });
          } else if (missingN && missingE) {
            corners.push({ pos: blockPos, rotY: Math.PI * 1.5 });
          } else {
            interiors.push({ pos: blockPos, rotY: 0, scale: [1.0, 1.0, 1.0] });
          }
        }
      } else if (missingCount === 1) {
        // Exposed perimeter edges facing the ocean
        if (missingS) {
          edges.push({ pos: blockPos, rotY: 0 });
        } else if (missingW) {
          edges.push({ pos: blockPos, rotY: Math.PI * 0.5 });
        } else if (missingN) {
          edges.push({ pos: blockPos, rotY: Math.PI });
        } else if (missingE) {
          edges.push({ pos: blockPos, rotY: Math.PI * 1.5 });
        }
      } else {
        // Fully enclosed interior tile - snug scale prevents hairline gaps between blocks
        const rotY = ((gx * 3 + gy * 7) % 4) * Math.PI * 0.5;
        interiors.push({ pos: blockPos, rotY, scale: [1.025, 1.0, 1.025] });
      }
    });

    const seals: [number, number, number][] = [];
    junctionMap.forEach((entry) => {
      // Seal all junctions where at least 2 adjacent unlocked tiles meet
      if (entry.count >= 2) {
        seals.push(entry.pos);
      }
    });

    return {
      interiorTiles: interiors,
      edgeTiles: edges,
      cornerTiles: corners,
      turfPositions: turfs,
      junctionSealPositions: seals,
      bedrockPositions: bedrocks,
    };
  }, [staticUnlockedSet, offset, tileSize, riverTileMap]);

  // Model variants for current active biome
  const isSnow = activeBiome === 'snow';
  const interiorModel = isSnow ? '/models/block-snow-low.glb' : '/models/block-grass-low.glb';
  const edgeModel = isSnow ? '/models/block-snow-overhang-low.glb' : '/models/block-grass-overhang-low.glb';
  const cornerModel = isSnow ? '/models/block-snow-corner-overhang-low.glb' : '/models/block-grass-corner-overhang-low.glb';

  return (
    <group position={[0, 0, 0]}>
      {/* 0. Solid Bedrock & Fertile Earth Base Slab (seals under-cliff view into ocean) */}
      <BedrockBaseInstances positions={bedrockPositions} activeBiome={activeBiome} />

      {/* 1. Interior Blocks */}
      <ModularBlockInstances modelUrl={interiorModel} instances={interiorTiles} />

      {/* 2. Edge Overhang Blocks */}
      <ModularBlockInstances modelUrl={edgeModel} instances={edgeTiles} />

      {/* 3. Corner Overhang Blocks */}
      <ModularBlockInstances modelUrl={cornerModel} instances={cornerTiles} />

      {/* 4. Seamless Unified Lawn Turf Overlay */}
      <SeamlessTurfOverlay positions={turfPositions} activeBiome={activeBiome} />

      {/* 5. Corner Junction Seals (eliminates chamfer diamond cavities between blocks) */}
      <JunctionSealOverlay positions={junctionSealPositions} activeBiome={activeBiome} />

      {/* 6. Dynamic Rising Land Blocks with spring physics & water splash */}
      {Array.from(risingTiles).map((key) => (
        <RisingLandBlock
          key={`rising_${key}`}
          coordKey={key}
          activeBiome={activeBiome}
          onSettled={handleTileSettled}
        />
      ))}
    </group>
  );
}
