import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  getTerrainElevation,
  gridToWorld,
  worldToGrid,
  getUnlockedTilesSignature,
} from '@/lib/game/worldRules';
import {
  buildRiverTileMap,
  getRiverChannelDistance,
  RiverAdjacency,
} from '@/lib/game/riverSystem';
import { useGameStore } from '@/lib/game/useGameStore';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

interface InstancedGrassProps {
  count?: number;
}

/**
 * Builds an organic, asymmetric 5-blade slender tuft cluster.
 * Uses upward-domed normals (Ghibli / Blender Normal-Transfer technique)
 * so slender blades never show harsh dark backfaces and blend into a seamless meadow.
 */
function createFluffyTuftGeometry(maxInstances: number): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 5 asymmetric, organically leaning slender blades with different lengths, leans, and curves
  const bladeSpecs = [
    { ox: -0.004, oz: 0.003, angle: 0.20, height: 0.096, width: 0.0052, bend: 0.026, lean: 0.08 },
    { ox: 0.032, oz: -0.018, angle: 1.55, height: 0.082, width: 0.0048, bend: 0.032, lean: 0.14 },
    { ox: -0.028, oz: 0.024, angle: 2.85, height: 0.090, width: 0.0050, bend: 0.024, lean: 0.11 },
    { ox: -0.019, oz: -0.031, angle: 4.10, height: 0.076, width: 0.0046, bend: 0.029, lean: 0.16 },
    { ox: 0.024, oz: 0.029, angle: 5.35, height: 0.086, width: 0.0049, bend: 0.027, lean: 0.12 },
  ];

  for (let b = 0; b < bladeSpecs.length; b++) {
    const spec = bladeSpecs[b];
    const cosA = Math.cos(spec.angle);
    const sinA = Math.sin(spec.angle);

    // Outward arch direction perpendicular to blade width
    const nx = -sinA;
    const nz = cosA;

    const baseHalfW = spec.width;
    const midHalfW = spec.width * 0.60;
    const h = spec.height;
    const bendOut = spec.bend;
    const midLean = h * spec.lean * 0.5;
    const tipLean = h * spec.lean;

    const baseIndex = positions.length / 3;

    // 5 vertices per slender curved blade:
    // 0: bottom-left, 1: bottom-right, 2: mid-left, 3: mid-right, 4: fine tapered tip
    const localVerts = [
      [-baseHalfW, 0.0, 0.0, 0.0],
      [baseHalfW, 0.0, 0.0, 0.0],
      [-midHalfW, h * 0.52, bendOut * 0.42 + midLean, 0.52],
      [midHalfW, h * 0.52, bendOut * 0.42 + midLean, 0.52],
      [0.0, h, bendOut + tipLean, 1.0],
    ];

    for (const [lx, ly, lz, vHeight] of localVerts) {
      const wx = spec.ox + lx * cosA + lz * nx;
      const wz = spec.oz + lx * sinA + lz * nz;
      positions.push(wx, ly, wz);

      // Stylized fluffy normal: dome predominantly upward (Y=0.96) for soft velvet shading
      const dLen = Math.hypot(wx * 1.8, 0.96, wz * 1.8) || 1;
      normals.push((wx * 1.8) / dLen, 0.96 / dLen, (wz * 1.8) / dLen);

      // UV.y stores normalized height (0 at root -> 1 at tip) for velvet shader gradient
      uvs.push(0.5, vHeight);
    }

    // 3 triangles per blade (15 triangles total per 5-blade cluster)
    indices.push(
      baseIndex + 0,
      baseIndex + 1,
      baseIndex + 2,
      baseIndex + 1,
      baseIndex + 3,
      baseIndex + 2,
      baseIndex + 2,
      baseIndex + 3,
      baseIndex + 4
    );
  }

  geom.setIndex(indices);
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const windOffsets = new Float32Array(maxInstances);
  for (let i = 0; i < maxInstances; i++) {
    windOffsets[i] = (i * 0.73) % (Math.PI * 2);
  }
  geom.setAttribute(
    'aWindOffset',
    new THREE.InstancedBufferAttribute(windOffsets, 1)
  );

  return geom;
}

export function InstancedGrass({ count: overrideCount }: InstancedGrassProps) {
  const graphicsQuality = usePreferencesStore((state) => state.graphicsQuality);
  const count =
    overrideCount ??
    (graphicsQuality === 'eco' ? 3000 : graphicsQuality === 'balanced' ? 6000 : 9000);
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);

  const unlockedSignature = useMemo(
    () => getUnlockedTilesSignature(world, worldObjects),
    [world, worldObjects]
  );

  const unlockedTiles = useMemo(() => {
    if (!unlockedSignature) return [];
    return unlockedSignature.split('|').map((key) => {
      const [gx, gy] = key.split(',').map(Number);
      return { grid_x: gx, grid_y: gy, key };
    });
  }, [unlockedSignature]);

  const unlockedKeySet = useMemo(
    () => new Set(unlockedTiles.map((t) => t.key)),
    [unlockedTiles]
  );

  // World positions of regular stepping-stone path centers
  const pathWorldCenters = useMemo(() => {
    const centers: { x: number; z: number }[] = [];
    for (const obj of worldObjects) {
      if (obj.object_type === 'path') {
        const v = (obj.model_variant || '').toLowerCase();
        if (!v.includes('river')) {
          const [wx, , wz] = gridToWorld(obj.grid_x, obj.grid_y, 0);
          centers.push({ x: wx, z: wz });
        }
      }
    }
    return centers;
  }, [worldObjects]);

  // Full 4-way orthogonal river network adjacency map across all unlocked tiles
  const riverTileMap = useMemo(() => {
    return buildRiverTileMap(worldObjects, unlockedKeySet);
  }, [worldObjects, unlockedKeySet]);

  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);

  const grassGeometry = useMemo(() => createFluffyTuftGeometry(count), [count]);

  // Stylized Fluffy Grass Material: root-to-tip velvet color gradient + rolling breeze wave
  const grassMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.86,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      mat.userData.shader = shader;

      shader.vertexShader = `
        uniform float uTime;
        attribute float aWindOffset;
        varying float vBladeHeight;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vBladeHeight = uv.y;
        float tipFactor = uv.y * uv.y;
        vec4 instWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float spatialPhase = instWorldPos.x * 1.45 + instWorldPos.z * 1.25 + aWindOffset;
        float windWave = sin(uTime * 2.2 + spatialPhase) * 0.020 * tipFactor;
        float windCross = cos(uTime * 1.7 + spatialPhase * 0.85) * 0.013 * tipFactor;
        transformed.x += windWave;
        transformed.z += windCross;
        `
      );

      shader.fragmentShader = `
        varying float vBladeHeight;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Root-to-tip stylized Ghibli velvet gradient:
        // Blends seamlessly with the island turf at root (vBladeHeight=0) and glows warmly at tips (vBladeHeight=1)
        vec3 rootTint = diffuseColor.rgb * 0.84;
        vec3 tipTint = min(vec3(1.0), diffuseColor.rgb * vec3(1.14, 1.17, 0.94));
        diffuseColor.rgb = mix(rootTint, tipTint, smoothstep(0.0, 0.92, vBladeHeight));
        `
      );
    };

    return mat;
  }, []);

  // Pure organic continuous scatter across the entire unlocked island surface (ZERO block/grid seams!)
  const { dummy, bladeData, flowerData } = useMemo(() => {
    const dummyObj = new THREE.Object3D();
    if (unlockedTiles.length === 0) {
      return { dummy: dummyObj, bladeData: [], flowerData: [] };
    }

    let seed = 739281;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const blades: {
      pos: THREE.Vector3;
      rotY: number;
      tiltX: number;
      tiltZ: number;
      scaleX: number;
      scaleY: number;
      scaleZ: number;
      tSunlit: number;
    }[] = [];

    const flowers: {
      pos: THREE.Vector3;
      scale: number;
      rotY: number;
      colorType: number;
    }[] = [];

    // Precompute neighbor connectivity for each unlocked tile so grass flows 100% seamlessly
    // across shared tile borders (-0.50 to +0.50), while staying neatly inside outer cliff edges.
    const tileBounds = unlockedTiles.map((tile) => {
      const [cx, , cz] = gridToWorld(tile.grid_x, tile.grid_y, 0);
      const hasLeft = unlockedKeySet.has(`${tile.grid_x - 1},${tile.grid_y}`);
      const hasRight = unlockedKeySet.has(`${tile.grid_x + 1},${tile.grid_y}`);
      const hasTop = unlockedKeySet.has(`${tile.grid_x},${tile.grid_y - 1}`);
      const hasBottom = unlockedKeySet.has(`${tile.grid_x},${tile.grid_y + 1}`);

      return {
        cx,
        cz,
        minX: hasLeft ? -0.505 : -0.42,
        maxX: hasRight ? 0.505 : 0.42,
        minZ: hasTop ? -0.505 : -0.42,
        maxZ: hasBottom ? 0.505 : 0.42,
        hasLeft,
        hasRight,
        hasTop,
        hasBottom,
      };
    });

    // Helper: checks if world coordinate (wx, wz) falls in or near any river channel
    const isRiverZone = (wx: number, wz: number, radius = 0.50): boolean => {
      if (riverTileMap.size === 0) return false;
      const g = worldToGrid(wx, wz);
      if (!g) return false;

      // If the coordinate falls on a river tile, strictly forbid grass inside the channel
      if (riverTileMap.has(`${g.grid_x},${g.grid_y}`)) {
        const [cx, , cz] = gridToWorld(g.grid_x, g.grid_y, 0);
        const adj = riverTileMap.get(`${g.grid_x},${g.grid_y}`)!;
        const dStream = getRiverChannelDistance(wx - cx, wz - cz, adj);
        if (dStream < 0.52) return true;
      }

      const candidates = [
        [g.grid_x, g.grid_y],
        [g.grid_x - 1, g.grid_y],
        [g.grid_x + 1, g.grid_y],
        [g.grid_x, g.grid_y - 1],
        [g.grid_x, g.grid_y + 1],
      ];

      for (const [gx, gy] of candidates) {
        const adj = riverTileMap.get(`${gx},${gy}`);
        if (!adj) continue;

        const [cx, , cz] = gridToWorld(gx, gy, 0);
        const dx = wx - cx;
        const dz = wz - cz;

        if (Math.abs(dx) <= 0.65 && Math.abs(dz) <= 0.65) {
          const dStream = getRiverChannelDistance(dx, dz, adj);
          if (dStream < radius) return true;
        }
      }
      return false;
    };

    const targetTotal = Math.min(count, unlockedTiles.length * 640);
    const maxAttempts = targetTotal * 2;

    for (let attempt = 0; attempt < maxAttempts && blades.length < targetTotal; attempt++) {
      // Pick a random unlocked tile and sample a 100% continuous random point across its full span
      const tb = tileBounds[Math.floor(rnd() * tileBounds.length)];
      const localX = tb.minX + rnd() * (tb.maxX - tb.minX);
      const localZ = tb.minZ + rnd() * (tb.maxZ - tb.minZ);

      // Clamp diagonal corners on exposed cliff edges so blades follow the chamfered block corner
      if (!tb.hasLeft && !tb.hasTop && (-localX) + (-localZ) > 0.50) continue;
      if (!tb.hasRight && !tb.hasTop && (localX) + (-localZ) > 0.50) continue;
      if (!tb.hasLeft && !tb.hasBottom && (-localX) + (localZ) > 0.50) continue;
      if (!tb.hasRight && !tb.hasBottom && (localX) + (localZ) > 0.50) continue;

      const x = tb.cx + localX;
      const z = tb.cz + localZ;

      // 1. Strict River exclusion: NEVER spawn grass inside water channels or sand canal slopes
      if (isRiverZone(x, z, 0.44)) continue;

      // 2. Stepping-stone paths exclusion
      let nearPath = false;
      for (let p = 0; p < pathWorldCenters.length; p++) {
        const dx = x - pathWorldCenters[p].x;
        const dz = z - pathWorldCenters[p].z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 0.13 + rnd() * 0.08) {
          nearPath = true;
          break;
        }
      }
      if (nearPath) continue;

      const { height } = getTerrainElevation(x, z);

      // Multi-octave organic meadow wave (non-axis-aligned angles so patches never form a grid)
      const w1 = Math.sin(x * 2.3 + z * 1.7) * 0.5 + Math.cos(x * 1.4 - z * 2.6) * 0.5;
      const w2 = Math.sin(x * 5.1 - z * 4.3) * 0.35;
      const clumpFactor = Math.max(0, Math.min(1, (w1 + w2 + 1.1) * 0.45));

      // Varied anisotropic scales & organic tilts so no two tufts look alike
      const scaleX = 0.72 + clumpFactor * 0.36 + rnd() * 0.34;
      const scaleZ = 0.72 + clumpFactor * 0.36 + rnd() * 0.34;
      const scaleY = 0.68 + clumpFactor * 0.54 + rnd() * 0.35;

      const rotY = rnd() * Math.PI * 2;
      const tiltX = (rnd() - 0.5) * 0.28;
      const tiltZ = (rnd() - 0.5) * 0.28;

      const elevBonus = Math.max(0, (height - 0.04) * 1.8);
      const tSunlit = Math.min(
        1,
        Math.max(0, clumpFactor * 0.56 + rnd() * 0.36 + elevBonus)
      );

      blades.push({
        pos: new THREE.Vector3(x, 0.002, z),
        rotY,
        tiltX,
        tiltZ,
        scaleX,
        scaleY,
        scaleZ,
        tSunlit,
      });

      // Sprinkle tiny pastel wildflowers organically across lush meadow drifts (strictly outside river)
      if (flowers.length < 280 && clumpFactor > 0.55 && rnd() < 0.018) {
        const fx = x + (rnd() - 0.5) * 0.04;
        const fz = z + (rnd() - 0.5) * 0.04;
        if (!isRiverZone(fx, fz, 0.44)) {
          flowers.push({
            pos: new THREE.Vector3(
              fx,
              0.004 + 0.036 * scaleY,
              fz
            ),
            scale: 0.015 + rnd() * 0.009,
            rotY: rnd() * Math.PI * 2,
            colorType: rnd(),
          });
        }
      }
    }

    return { dummy: dummyObj, bladeData: blades, flowerData: flowers };
  }, [count, unlockedTiles, unlockedKeySet, pathWorldCenters, riverTileMap]);

  const grassPalette = useGameStore((state) => state.grassPalette || 'natural');
  const activeBiome = useGameStore((state) => state.activeBiome || 'meadow');

  // Apply matrices and multi-tone emerald/lime or winter frost colors
  useEffect(() => {
    if (!grassRef.current) return;

    const isSnow = activeBiome === 'snow';
    const isEmerald = grassPalette === 'emerald';

    // Snow Biome: Soft, shimmering winter frost crystals
    const frostBase = new THREE.Color('#CBD5E1');
    const frostMid = new THREE.Color('#E2E8F0');
    const frostTip = new THREE.Color('#FFFFFF');

    // Meadow Biome: Lush emerald and sunlit gold tones
    const lushEmerald = new THREE.Color(isEmerald ? '#2EA86E' : '#6EAE46');
    const sunlitMeadow = new THREE.Color(isEmerald ? '#4ED48E' : '#9ED45A');
    const goldenCrest = new THREE.Color(isEmerald ? '#86EAB5' : '#BCE668');
    const tempCol = new THREE.Color();

    for (let i = 0; i < bladeData.length; i++) {
      const item = bladeData[i];

      dummy.position.copy(item.pos);
      dummy.rotation.set(item.tiltX, item.rotY, item.tiltZ, 'YXZ');
      dummy.scale.set(
        isSnow ? item.scaleX * 0.75 : item.scaleX,
        isSnow ? item.scaleY * 0.70 : item.scaleY,
        isSnow ? item.scaleZ * 0.75 : item.scaleZ
      );
      dummy.updateMatrix();

      grassRef.current.setMatrixAt(i, dummy.matrix);

      if (isSnow) {
        if (item.tSunlit < 0.5) {
          tempCol.lerpColors(frostBase, frostMid, item.tSunlit * 2.0);
        } else {
          tempCol.lerpColors(frostMid, frostTip, (item.tSunlit - 0.5) * 2.0);
        }
      } else {
        if (item.tSunlit < 0.65) {
          tempCol.lerpColors(lushEmerald, sunlitMeadow, item.tSunlit / 0.65);
        } else {
          tempCol.lerpColors(sunlitMeadow, goldenCrest, (item.tSunlit - 0.65) / 0.35);
        }
      }

      grassRef.current.setColorAt(i, tempCol);
    }

    grassRef.current.instanceMatrix.needsUpdate = true;
    if (grassRef.current.instanceColor) {
      grassRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, bladeData, grassPalette, activeBiome]);

  // Set transforms and pastel colors for meadow wildflowers or winter frost florets
  useEffect(() => {
    if (!flowerRef.current) return;

    const isSnow = activeBiome === 'snow';

    const creamWhite = new THREE.Color(isSnow ? '#FFFFFF' : '#FFFDF5');
    const buttercupYellow = new THREE.Color(isSnow ? '#BAE6FD' : '#FDE68A');
    const softBlossom = new THREE.Color(isSnow ? '#E0F2FE' : '#FBCFE8');

    for (let i = 0; i < flowerData.length; i++) {
      const f = flowerData[i];
      dummy.position.copy(f.pos);
      dummy.rotation.set(-Math.PI / 2 + 0.15, 0, f.rotY);
      dummy.scale.set(f.scale, f.scale, f.scale);
      dummy.updateMatrix();

      flowerRef.current.setMatrixAt(i, dummy.matrix);
      const col =
        f.colorType < 0.62
          ? creamWhite
          : f.colorType < 0.88
          ? buttercupYellow
          : softBlossom;
      flowerRef.current.setColorAt(i, col);
    }

    flowerRef.current.instanceMatrix.needsUpdate = true;
    if (flowerRef.current.instanceColor) {
      flowerRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, flowerData, activeBiome]);

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      grassGeometry.dispose();
      grassMaterial.dispose();
    };
  }, [grassGeometry, grassMaterial]);

  // Drive GPU wind shader time uniform
  useFrame(({ clock }) => {
    if (grassMaterial.userData?.shader) {
      grassMaterial.userData.shader.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  if (bladeData.length === 0) return null;

  return (
    <group>
      {/* 1. Stylized Fluffy Meadow Tufts (Ghibli / Normal-Domed Instanced Clusters) */}
      <instancedMesh
        ref={grassRef}
        args={[grassGeometry, grassMaterial, bladeData.length]}
        receiveShadow
        castShadow={false}
        frustumCulled={false}
      />

      {/* 2. Pastel Wildflowers Nestled in Fluffy Grass Mounds */}
      {flowerData.length > 0 && (
        <instancedMesh
          ref={flowerRef}
          args={[undefined, undefined, flowerData.length]}
          receiveShadow
          frustumCulled={false}
        >
          <circleGeometry args={[1, 6]} />
          <meshStandardMaterial
            roughness={0.65}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}
