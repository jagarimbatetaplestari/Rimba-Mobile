'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/lib/game/useGameStore';
import { soundscapeManager, SoundscapeType } from '@/lib/audio/soundscapes';
import {
  getUnlockedTilesSet,
  getUnlockedTilesSignature,
  getTerrainElevation,
} from '@/lib/game/worldRules';
import { GAME_CONFIG } from '@/lib/game/config';

const glowTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates or retrieves a cached circular soft radial gradient texture on an offscreen canvas.
 * Prevents WebGL Points from rendering as ugly square pixels and eliminates GPU texture thrashing.
 */
function getRadialGlowTexture(
  colorInner: string,
  colorMid: string,
  colorOuter: string,
  size = 64
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${colorInner}|${colorMid}|${colorOuter}|${size}`;
  const cached = glowTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, colorInner);
  grad.addColorStop(0.24, colorMid);
  grad.addColorStop(0.65, colorOuter);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  glowTextureCache.set(key, texture);
  return texture;
}

// ==========================================
// 1. RAIN PARTICLES (Active during 'rain' soundscape)
// ==========================================
const RAIN_COUNT = 320;

function RainParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const rainTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 255, 255, 0.95)',
      'rgba(180, 220, 255, 0.65)',
      'rgba(140, 190, 240, 0.1)',
      32
    );
  }, []);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3);
    const vel = new Float32Array(RAIN_COUNT);

    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 14 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      vel[i] = 0.22 + Math.random() * 0.12;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < RAIN_COUNT; i++) {
      // Slanted falling trajectory
      array[i * 3 + 0] += 0.035; // Slight wind drift X
      array[i * 3 + 1] -= velocities[i]; // Fall Y
      array[i * 3 + 2] -= 0.02; // Slight wind drift Z

      // Reset when reaching island base
      if (array[i * 3 + 1] < 0.1) {
        array[i * 3 + 0] = (Math.random() - 0.5) * 16 - 2;
        array[i * 3 + 1] = 14 + Math.random() * 2;
        array[i * 3 + 2] = (Math.random() - 0.5) * 16 + 2;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={rainTexture || undefined}
        color="#A5D4F2"
        size={0.18}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// 1b. WATER & GROUND RAIN RIPPLES
// Gentle expanding concentric ripples on river and meadow
// ==========================================
const RIPPLE_COUNT = 24;

function RainRipples() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ripples = useRef(
    Array.from({ length: RIPPLE_COUNT }, () => ({
      x: 0,
      y: 0.1,
      z: 0,
      progress: Math.random(),
      speed: 0.012 + Math.random() * 0.016,
      maxRadius: 0.35 + Math.random() * 0.35,
    }))
  );

  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );
  const unlockedSet = useMemo(() => {
    const state = useGameStore.getState();
    return getUnlockedTilesSet(state.saveData.world, state.saveData.world_objects);
  }, [unlockedSignature]);

  const unlockedTiles = useMemo(() => {
    const list: { cx: number; cz: number }[] = [];
    const tileSize = GAME_CONFIG.grid.tileSize;
    const offset = GAME_CONFIG.grid.offset;
    unlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (Number.isInteger(gx) && Number.isInteger(gy)) {
        list.push({
          cx: (gx + offset) * tileSize,
          cz: (gy + offset) * tileSize,
        });
      }
    });
    return list;
  }, [unlockedSet]);

  const ringGeo = useMemo(() => new THREE.RingGeometry(0.04, 0.09, 20), []);

  useFrame(() => {
    if (unlockedTiles.length === 0) return;
    const tileSize = GAME_CONFIG.grid.tileSize;
    ripples.current.forEach((r, idx) => {
      r.progress += r.speed;
      if (r.progress >= 1) {
        r.progress = 0;
        const tile = unlockedTiles[Math.floor(Math.random() * unlockedTiles.length)];
        r.x = tile.cx + (Math.random() - 0.5) * tileSize * 0.85;
        r.z = tile.cz + (Math.random() - 0.5) * tileSize * 0.85;
        r.y = getTerrainElevation(r.x, r.z).height + 0.035;
      }
      const mesh = meshRefs.current[idx];
      if (mesh) {
        mesh.position.set(r.x, r.y, r.z);
        const scale = 0.2 + r.progress * (r.maxRadius / 0.09);
        mesh.scale.set(scale, scale, 1);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = Math.max(0, (1 - r.progress) * 0.55);
        }
      }
    });
  });

  return (
    <group>
      {Array.from({ length: RIPPLE_COUNT }).map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            meshRefs.current[idx] = el;
          }}
          geometry={ringGeo}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            color="#A8D8F0"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ==========================================
// 2. NIGHT FIREFLIES (Active during 'night' timeOfDay)
// Bound strictly to unlocked land tiles & low hovering altitude
// ==========================================
function Fireflies() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );

  const unlockedSet = useMemo(() => {
    const state = useGameStore.getState();
    return getUnlockedTilesSet(state.saveData.world, state.saveData.world_objects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedSignature]);

  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;

  // List of unlocked tile coordinates in world space
  const unlockedTiles = useMemo(() => {
    const list: { gx: number; gy: number; cx: number; cz: number }[] = [];
    unlockedSet.forEach((key) => {
      const [gx, gy] = key.split(',').map(Number);
      if (Number.isInteger(gx) && Number.isInteger(gy)) {
        const cx = (gx + offset) * tileSize;
        const cz = (gy + offset) * tileSize;
        list.push({ gx, gy, cx, cz });
      }
    });
    return list;
  }, [unlockedSet, offset, tileSize]);

  // Scaled with unlocked land size: ~3 fireflies per tile (e.g. 9 starter tiles = 27 fireflies; max 65)
  const count = Math.min(65, Math.max(16, unlockedTiles.length * 3));

  // Soft circular bioluminescent glow sprite texture
  const fireflyTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(235, 255, 160, 0.95)',
      'rgba(165, 245, 95, 0.35)',
      64
    );
  }, []);

  const { initialPositions, speeds, offsets, radii } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count);
    const rad = new Float32Array(count);

    if (unlockedTiles.length === 0) {
      return { initialPositions: pos, speeds: spd, offsets: off, radii: rad };
    }

    for (let i = 0; i < count; i++) {
      // Pick a random unlocked tile so fireflies NEVER stray into the void
      const tile = unlockedTiles[i % unlockedTiles.length];
      const px = tile.cx + (Math.random() - 0.5) * tileSize * 0.75;
      const pz = tile.cz + (Math.random() - 0.5) * tileSize * 0.75;
      const groundH = getTerrainElevation(px, pz).height;

      // DO NOT FLY TOO HIGH: Hover low above the ground (15cm to 65cm above terrain)
      const py = groundH + 0.15 + Math.random() * 0.50;

      pos[i * 3 + 0] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      spd[i] = 0.6 + Math.random() * 0.8;
      off[i] = Math.random() * Math.PI * 2;
      rad[i] = 0.12 + Math.random() * 0.15; // Small, gentle float radius
    }
    return { initialPositions: pos, speeds: spd, offsets: off, radii: rad };
  }, [count, unlockedTiles, tileSize]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const speed = speeds[i];
      const offset = offsets[i];
      const radius = radii[i];
      // Gentle horizontal drift and small subtle vertical float (+/- 6cm) close to foliage
      array[i * 3 + 0] = initialPositions[i * 3 + 0] + Math.sin(t * speed + offset) * radius;
      array[i * 3 + 1] = initialPositions[i * 3 + 1] + Math.sin(t * speed * 0.8 + offset) * 0.06;
      array[i * 3 + 2] = initialPositions[i * 3 + 2] + Math.cos(t * speed * 0.7 + offset) * radius;
    }
    posAttr.needsUpdate = true;

    // Bioluminescent gentle breathing pulse
    if (materialRef.current) {
      materialRef.current.opacity = 0.70 + Math.sin(t * 2.2) * 0.25;
    }
  });

  return (
    <group>
      {/* Soft warm bioluminescent central garden glow */}
      <pointLight position={[0, 1.2, 0]} color="#B8F572" intensity={0.55} distance={10} decay={2} />

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions.slice(), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          map={fireflyTexture || undefined}
          color="#D4F987"
          size={0.38}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ==========================================
// 3. WARM EMBERS (Active during 'fire' soundscape)
// ==========================================
const EMBER_COUNT = 65;

function EmberParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const emberTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 255, 230, 1)',
      'rgba(255, 180, 60, 0.9)',
      'rgba(240, 95, 20, 0.3)',
      64
    );
  }, []);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(EMBER_COUNT * 3);
    const vel = new Float32Array(EMBER_COUNT);

    for (let i = 0; i < EMBER_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = 0.2 + Math.random() * 4.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      vel[i] = 0.02 + Math.random() * 0.025;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < EMBER_COUNT; i++) {
      array[i * 3 + 1] += velocities[i];
      array[i * 3 + 0] += Math.sin(t * 3 + i) * 0.012;
      array[i * 3 + 2] += Math.cos(t * 3 + i) * 0.012;

      // Reset when floating away
      if (array[i * 3 + 1] > 4.8) {
        array[i * 3 + 0] = (Math.random() - 0.5) * 3;
        array[i * 3 + 1] = 0.2 + Math.random() * 0.3;
        array[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={emberTexture || undefined}
        color="#FFA347"
        size={0.28}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// 4. DRIFTING LEAVES (Active during 'wind' soundscape)
// ==========================================
const LEAF_COUNT = 40;

function WindLeaves() {
  const pointsRef = useRef<THREE.Points>(null);

  const leafTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(180, 240, 110, 1)',
      'rgba(130, 210, 75, 0.85)',
      'rgba(90, 170, 50, 0.2)',
      64
    );
  }, []);

  const { positions } = useMemo(() => {
    const pos = new Float32Array(LEAF_COUNT * 3);
    for (let i = 0; i < LEAF_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = 0.6 + Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return { positions: pos };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < LEAF_COUNT; i++) {
      // Wind blowing diagonally across the island
      array[i * 3 + 0] -= 0.045;
      array[i * 3 + 1] += Math.sin(t * 2 + i) * 0.01;
      array[i * 3 + 2] += 0.025;

      // Wrap around
      if (array[i * 3 + 0] < -7.5) {
        array[i * 3 + 0] = 7.5;
        array[i * 3 + 1] = 1.0 + Math.random() * 3.5;
        array[i * 3 + 2] = (Math.random() - 0.5) * 14;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={leafTexture || undefined}
        color="#82C84A"
        size={0.28}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// 5. MOUNTAIN MIST WISPS (Active during 'mist' weather)
// Soft, slow horizontal highland clouds hovering above island
// ==========================================
const MIST_COUNT = 22;

function MountainMist() {
  const pointsRef = useRef<THREE.Points>(null);

  const mistTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(240, 248, 245, 0.35)',
      'rgba(215, 235, 230, 0.18)',
      'rgba(195, 220, 215, 0.0)',
      128
    );
  }, []);

  const { positions, driftSpeeds, baseAlts } = useMemo(() => {
    const pos = new Float32Array(MIST_COUNT * 3);
    const spd = new Float32Array(MIST_COUNT);
    const alt = new Float32Array(MIST_COUNT);

    for (let i = 0; i < MIST_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      const h = 0.6 + Math.random() * 2.0;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      spd[i] = 0.008 + Math.random() * 0.012;
      alt[i] = h;
    }
    return { positions: pos, driftSpeeds: spd, baseAlts: alt };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < MIST_COUNT; i++) {
      array[i * 3 + 0] += driftSpeeds[i];
      array[i * 3 + 1] = baseAlts[i] + Math.sin(t * 0.6 + i) * 0.12;
      array[i * 3 + 2] += Math.sin(t * 0.4 + i) * 0.004;

      if (array[i * 3 + 0] > 9) {
        array[i * 3 + 0] = -9;
        array[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={mistTexture || undefined}
        color="#E2F0EB"
        size={4.2}
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

// ==========================================
// 6. AUTUMN MAPLE SWIRLING LEAVES
// ==========================================
const AUTUMN_LEAF_COUNT = 48;

function AutumnMapleLeaves() {
  const pointsRef = useRef<THREE.Points>(null);

  const mapleTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 140, 50, 1)',
      'rgba(220, 60, 20, 0.85)',
      'rgba(140, 20, 10, 0.2)',
      64
    );
  }, []);

  const { positions, rotOffsets } = useMemo(() => {
    const pos = new Float32Array(AUTUMN_LEAF_COUNT * 3);
    const rot = new Float32Array(AUTUMN_LEAF_COUNT);
    for (let i = 0; i < AUTUMN_LEAF_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = 0.5 + Math.random() * 5.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      rot[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, rotOffsets: rot };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < AUTUMN_LEAF_COUNT; i++) {
      array[i * 3 + 0] -= 0.038 + Math.sin(t * 1.5 + rotOffsets[i]) * 0.012;
      array[i * 3 + 1] -= 0.015;
      array[i * 3 + 2] += 0.022 + Math.cos(t * 1.2 + rotOffsets[i]) * 0.01;

      if (array[i * 3 + 1] < 0.1 || array[i * 3 + 0] < -8.5) {
        array[i * 3 + 0] = 8.5;
        array[i * 3 + 1] = 3.5 + Math.random() * 2.5;
        array[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={mapleTexture || undefined}
        color="#EA580C"
        size={0.34}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// 7. LOTUS & SAKURA DRIFTING PETALS
// ==========================================
const LOTUS_PETAL_COUNT = 52;

function LotusSakuraPetals() {
  const pointsRef = useRef<THREE.Points>(null);

  const petalTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 230, 240, 1)',
      'rgba(244, 114, 182, 0.85)',
      'rgba(219, 39, 119, 0.2)',
      64
    );
  }, []);

  const { positions, driftPhases } = useMemo(() => {
    const pos = new Float32Array(LOTUS_PETAL_COUNT * 3);
    const phases = new Float32Array(LOTUS_PETAL_COUNT);
    for (let i = 0; i < LOTUS_PETAL_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = 0.4 + Math.random() * 4.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, driftPhases: phases };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < LOTUS_PETAL_COUNT; i++) {
      array[i * 3 + 0] += Math.sin(t * 1.1 + driftPhases[i]) * 0.015 - 0.018;
      array[i * 3 + 1] -= 0.012;
      array[i * 3 + 2] += Math.cos(t * 0.9 + driftPhases[i]) * 0.018 + 0.012;

      if (array[i * 3 + 1] < 0.08 || array[i * 3 + 0] < -8.0) {
        array[i * 3 + 0] = 7.5 + Math.random() * 1.5;
        array[i * 3 + 1] = 3.0 + Math.random() * 2.5;
        array[i * 3 + 2] = (Math.random() - 0.5) * 15;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={petalTexture || undefined}
        color="#F472B6"
        size={0.30}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// 8. ZEN WINTER SNOWFLAKES
// ==========================================
const SNOW_COUNT = 85;

function ZenSnowflakes() {
  const pointsRef = useRef<THREE.Points>(null);

  const snowTexture = useMemo(() => {
    return getRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(224, 242, 254, 0.85)',
      'rgba(186, 230, 253, 0.2)',
      64
    );
  }, []);

  const { positions, flutterRates } = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3);
    const rates = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = 0.5 + Math.random() * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      rates[i] = 0.015 + Math.random() * 0.02;
    }
    return { positions: pos, flutterRates: rates };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < SNOW_COUNT; i++) {
      array[i * 3 + 0] += Math.sin(t * 1.5 + i) * 0.008;
      array[i * 3 + 1] -= flutterRates[i];
      array[i * 3 + 2] += Math.cos(t * 1.2 + i) * 0.008;

      if (array[i * 3 + 1] < 0.1) {
        array[i * 3 + 0] = (Math.random() - 0.5) * 16;
        array[i * 3 + 1] = 7.0 + Math.random() * 1.5;
        array[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={snowTexture || undefined}
        color="#F8FAFC"
        size={0.24}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// MAIN WEATHER & ATMOSPHERE EFFECTS CONTAINER
// ==========================================
export function WeatherEffects() {
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const weather = useGameStore((state) => state.weather);
  const activeBiome = useGameStore((state) => state.activeBiome);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(
    soundscapeManager.getCurrentTrack()
  );

  useEffect(() => {
    const handleSoundscapeChange = (e: Event) => {
      const track = (e as CustomEvent).detail as SoundscapeType;
      setActiveSoundscape(track);
    };

    window.addEventListener('rimba:soundscape_change', handleSoundscapeChange);
    return () => window.removeEventListener('rimba:soundscape_change', handleSoundscapeChange);
  }, []);

  const isRaining = weather === 'rain' || activeSoundscape === 'rain';
  const isMisty = weather === 'mist';

  return (
    <group>
      {/* 🌧️ Rain Particles & Ground Ripples */}
      {isRaining && (
        <>
          <RainParticles />
          <RainRipples />
        </>
      )}

      {/* 🌫️ Mountain Mist Highland Wisps */}
      {isMisty && <MountainMist />}

      {/* 🌙 Night Fireflies (Soft circular glowing bioluminescence) */}
      {timeOfDay === 'night' && <Fireflies />}

      {/* 🔥 Campfire Warm Embers */}
      {activeSoundscape === 'fire' && <EmberParticles />}

      {/* 🍃 Pine Wind Drifting Leaves */}
      {activeSoundscape === 'wind' && <WindLeaves />}

      {/* 🍁 Autumn Maple Swirling Leaves */}
      {activeBiome === 'autumn' && <AutumnMapleLeaves />}

      {/* 🌸 Lotus Blossom Pink Petals */}
      {activeBiome === 'lotus' && <LotusSakuraPetals />}

      {/* ❄️ Winter Snowflakes */}
      {activeBiome === 'snow' && <ZenSnowflakes />}
    </group>
  );
}
