import React, { useMemo, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game/useGameStore';
import {
  getTerrainElevation,
  getUnlockedTilesSet,
  getUnlockedTilesSignature,
} from '@/lib/game/worldRules';
import { GAME_CONFIG } from '@/lib/game/config';
import { RisingLandBlock } from './RisingLandBlock';
import { buildRiverTileMap, getRiverChannelDistance, RiverAdjacency } from '@/lib/game/riverSystem';

/**
 * Procedural Warm Terracotta / Cork Soil Texture for Island Side Walls
 * Bright and sunlit (#BA8E5E / #C79C6A) to prevent dark/black side faces
 */
function createWarmSoilTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Warm terracotta / rich cork base tone
  ctx.fillStyle = '#BA8E5E';
  ctx.fillRect(0, 0, 256, 128);

  // Micro-speckles of earth, sandstone, and warm minerals
  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const radius = 0.5 + Math.random() * 1.5;
    const factor = 0.90 + Math.random() * 0.22;
    const r = Math.min(255, Math.floor(186 * factor));
    const g = Math.min(255, Math.floor(142 * factor));
    const b = Math.min(255, Math.floor(94 * factor));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gentle warm geological strata bands
  for (let y = 0; y < 128; y += 12) {
    const factor = 0.92 + Math.random() * 0.16;
    const darkR = Math.floor(165 * factor);
    const darkG = Math.floor(120 * factor);
    const darkB = Math.floor(75 * factor);
    ctx.fillStyle = `rgba(${darkR}, ${darkG}, ${darkB}, 0.16)`;
    ctx.fillRect(0, y + (Math.random() * 3 - 1.5), 256, 3 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * Dynamic Modular Diorama Island:
 * Generates 3D green meadow and terracotta soil walls ONLY on unlocked tiles.
 * When the user expands the island, new 3D land blocks dynamically rise and merge!
 */
export function Island() {
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);

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

  const soilTexture = useMemo(() => createWarmSoilTexture(), []);
  const bottomY = -0.22;
  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;

  // Map tiles that contain a river stream or bridge so the island carves a recessed river channel
  const riverTileMap = useMemo(() => {
    return buildRiverTileMap(worldObjects, staticUnlockedSet);
  }, [worldObjects, staticUnlockedSet]);

  const grassPalette = useGameStore((state) => state.grassPalette || 'natural');

  // 1. Top sculpted rolling meadow geometry (with recessed river channels) for all unlocked tiles
  const topGeo = useMemo(() => {
    const verts: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const isEmerald = grassPalette === 'emerald';
    const grassLawn = new THREE.Color(isEmerald ? '#34B377' : '#88C252');
    const grassSunlit = new THREE.Color(isEmerald ? '#58DE99' : '#A4D864');
    const riverSand = new THREE.Color('#DFD2B7');
    const tempCol = new THREE.Color();

    staticUnlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;

      const riverAdj = riverTileMap.get(key);
      const subdiv = 10;

      const cx = (gx + offset) * tileSize;
      const cz = (gy + offset) * tileSize;
      const half = tileSize / 2;
      const xMin = cx - half;
      const zMin = cz - half;
      const baseIdx = verts.length / 3;

      for (let ix = 0; ix <= subdiv; ix++) {
        for (let iz = 0; iz <= subdiv; iz++) {
          const vx = xMin + (ix / subdiv) * tileSize;
          const vz = zMin + (iz / subdiv) * tileSize;
          let { height } = getTerrainElevation(vx, vz);

          // Natural sunlit variation
          const noise =
            (Math.sin(vx * 1.8) * Math.cos(vz * 1.8) +
              Math.sin(vx * 3.2 + vz * 2.2)) *
            0.06;
          const elevBonus = Math.max(0, (height - 0.04) * 2.0);
          tempCol.lerpColors(
            grassLawn,
            grassSunlit,
            Math.min(1, Math.max(0, 0.45 + noise + elevBonus))
          );

          // Carve wide recessed river bed if this tile is a river or bridge tile (~0.88m wide)
          if (riverAdj) {
            const dx = vx - cx;
            const dz = vz - cz;
            const dStream = getRiverChannelDistance(dx, dz, riverAdj);
            const riverHalfWidth = 0.44;
            if (dStream < riverHalfWidth) {
              const tBank = dStream / riverHalfWidth;
              const smoothBank = tBank * tBank * (3 - 2 * tBank);
              height -= (1 - smoothBank) * 0.16;
              tempCol.lerp(riverSand, (1 - smoothBank) * 0.90);
            }
          }

          verts.push(vx, height, vz);
          colors.push(tempCol.r, tempCol.g, tempCol.b);
        }
      }

      for (let ix = 0; ix < subdiv; ix++) {
        for (let iz = 0; iz < subdiv; iz++) {
          const rowStride = subdiv + 1;
          const i0 = baseIdx + ix * rowStride + iz;
          const i1 = baseIdx + (ix + 1) * rowStride + iz;
          const i2 = baseIdx + (ix + 1) * rowStride + (iz + 1);
          const i3 = baseIdx + ix * rowStride + (iz + 1);

          indices.push(i0, i2, i1);
          indices.push(i0, i3, i2);
        }
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [staticUnlockedSet, offset, tileSize, riverTileMap, grassPalette]);

  // 2. Seamless vertical soil side walls only on exposed outer perimeter edges
  const sideWallsGeo = useMemo(() => {
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const getEdgeHeight = (vx: number, vz: number, cx: number, cz: number, riverAdj?: RiverAdjacency) => {
      let h = getTerrainElevation(vx, vz).height;
      if (riverAdj) {
        const dx = vx - cx;
        const dz = vz - cz;
        const dStream = getRiverChannelDistance(dx, dz, riverAdj);
        const riverHalfWidth = 0.44;
        if (dStream < riverHalfWidth) {
          const tBank = dStream / riverHalfWidth;
          const smoothBank = tBank * tBank * (3 - 2 * tBank);
          h -= (1 - smoothBank) * 0.16;
        }
      }
      return h;
    };

    const addWallStrip = (
      pointsTop: { x: number; y: number; z: number }[]
    ) => {
      const baseIdx = verts.length / 3;
      const count = pointsTop.length;

      for (let i = 0; i < count; i++) {
        const pt = pointsTop[i];
        const u = i / (count - 1);

        verts.push(pt.x, pt.y, pt.z);
        uvs.push(u, 1);

        verts.push(pt.x, bottomY, pt.z);
        uvs.push(u, 0);

        if (i < count - 1) {
          const idx = baseIdx + i * 2;
          indices.push(idx, idx + 2, idx + 1);
          indices.push(idx + 1, idx + 2, idx + 3);
        }
      }
    };

    staticUnlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;

      const riverAdj = riverTileMap.get(key);
      const subdiv = 10;

      const cx = (gx + offset) * tileSize;
      const cz = (gy + offset) * tileSize;
      const half = tileSize / 2;
      const xMin = cx - half;
      const xMax = cx + half;
      const zMin = cz - half;
      const zMax = cz + half;

      // North wall (gy - 1): exposed if North neighbor is empty
      if (!staticUnlockedSet.has(`${gx},${gy - 1}`)) {
        const topPts: { x: number; y: number; z: number }[] = [];
        for (let i = 0; i <= subdiv; i++) {
          const x = xMax - (i / subdiv) * tileSize;
          topPts.push({ x, y: getEdgeHeight(x, zMin, cx, cz, riverAdj), z: zMin });
        }
        addWallStrip(topPts);
      }

      // South wall (gy + 1): exposed if South neighbor is empty
      if (!staticUnlockedSet.has(`${gx},${gy + 1}`)) {
        const topPts: { x: number; y: number; z: number }[] = [];
        for (let i = 0; i <= subdiv; i++) {
          const x = xMin + (i / subdiv) * tileSize;
          topPts.push({ x, y: getEdgeHeight(x, zMax, cx, cz, riverAdj), z: zMax });
        }
        addWallStrip(topPts);
      }

      // East wall (gx + 1): exposed if East neighbor is empty
      if (!staticUnlockedSet.has(`${gx + 1},${gy}`)) {
        const topPts: { x: number; y: number; z: number }[] = [];
        for (let i = 0; i <= subdiv; i++) {
          const z = zMax - (i / subdiv) * tileSize;
          topPts.push({ x: xMax, y: getEdgeHeight(xMax, z, cx, cz, riverAdj), z });
        }
        addWallStrip(topPts);
      }

      // West wall (gx - 1): exposed if West neighbor is empty
      if (!staticUnlockedSet.has(`${gx - 1},${gy}`)) {
        const topPts: { x: number; y: number; z: number }[] = [];
        for (let i = 0; i <= subdiv; i++) {
          const z = zMin + (i / subdiv) * tileSize;
          topPts.push({ x: xMin, y: getEdgeHeight(xMin, z, cx, cz, riverAdj), z });
        }
        addWallStrip(topPts);
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [staticUnlockedSet, offset, tileSize, bottomY, riverTileMap]);

  // 3. Bottom floor plate under all unlocked tiles
  const bottomGeo = useMemo(() => {
    const verts: number[] = [];
    const indices: number[] = [];

    staticUnlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return;

      const cx = (gx + offset) * tileSize;
      const cz = (gy + offset) * tileSize;
      const half = tileSize / 2;
      const xMin = cx - half;
      const xMax = cx + half;
      const zMin = cz - half;
      const zMax = cz + half;
      const baseIdx = verts.length / 3;

      verts.push(xMin, bottomY, zMin);
      verts.push(xMax, bottomY, zMin);
      verts.push(xMax, bottomY, zMax);
      verts.push(xMin, bottomY, zMax);

      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [staticUnlockedSet, offset, tileSize, bottomY]);

  // Dispose GPU geometries and procedural texture when rebuilt or unmounted
  useEffect(() => {
    return () => {
      topGeo.dispose();
      sideWallsGeo.dispose();
      bottomGeo.dispose();
    };
  }, [topGeo, sideWallsGeo, bottomGeo]);

  useEffect(() => {
    return () => {
      soilTexture?.dispose();
    };
  }, [soilTexture]);

  return (
    <group position={[0, 0, 0]}>
      {/* Top rolling meadow for active tiles */}
      <mesh geometry={topGeo} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.0}
        />
      </mesh>

      {/* Warm terracotta cork soil side walls for perimeter */}
      <mesh geometry={sideWallsGeo} receiveShadow>
        <meshStandardMaterial
          color="#BA8E5E"
          map={soilTexture || undefined}
          roughness={0.88}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottom floor plate */}
      <mesh geometry={bottomGeo}>
        <meshStandardMaterial color="#8A633E" roughness={0.95} />
      </mesh>

      {/* Dynamic Rising Land Blocks with spring physics & water splash */}
      {Array.from(risingTiles).map((key) => (
        <RisingLandBlock
          key={`rising_${key}`}
          coordKey={key}
          soilTexture={soilTexture}
          onSettled={handleTileSettled}
        />
      ))}
    </group>
  );
}
