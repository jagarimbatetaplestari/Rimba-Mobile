import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GAME_CONFIG } from '@/lib/game/config';
import { getTerrainElevation } from '@/lib/game/worldRules';
import { soundManager } from '@/lib/audio/sounds';
import { hapticSuccess } from '@/lib/mobile/nativeBridge';

interface RisingLandBlockProps {
  coordKey: string; // "grid_x,grid_y"
  soilTexture: THREE.CanvasTexture | null;
  onSettled: (coordKey: string) => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export function RisingLandBlock({
  coordKey,
  soilTexture,
  onSettled,
}: RisingLandBlockProps) {
  const [gx, gy] = useMemo(() => coordKey.split(',').map(Number), [coordKey]);

  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;
  const bottomY = -0.22;

  const cx = (gx + offset) * tileSize;
  const cz = (gy + offset) * tileSize;

  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Spring physics variables
  const yRef = useRef<number>(-1.25);
  const velRef = useRef<number>(0);
  const hasTriggeredSplash = useRef<boolean>(false);
  const isSettledRef = useRef<boolean>(false);

  // Particle pool for water splash and golden dust (Ref-based for 0-overhead 60fps render loop)
  const particleListRef = useRef<Particle[]>([]);

  // Sound & Haptic on start
  useEffect(() => {
    soundManager.playPop();
    hapticSuccess();
  }, []);

  // Construct individual land tile geometry (meadow top + 4 soil side walls)
  const { meadowGeo, wallsGeo } = useMemo(() => {
    const subdiv = 6;
    const half = tileSize / 2;
    const xMin = cx - half;
    const zMin = cz - half;

    // 1. Meadow Top
    const mVerts: number[] = [];
    const mColors: number[] = [];
    const mIndices: number[] = [];

    const grassLawn = new THREE.Color('#88C252');
    const grassSunlit = new THREE.Color('#A4D864');
    const tempCol = new THREE.Color();

    for (let ix = 0; ix <= subdiv; ix++) {
      for (let iz = 0; iz <= subdiv; iz++) {
        const vx = xMin + (ix / subdiv) * tileSize;
        const vz = zMin + (iz / subdiv) * tileSize;
        const { height } = getTerrainElevation(vx, vz);

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

        // Relative to group center (cx, 0, cz)
        mVerts.push(vx - cx, height, vz - cz);
        mColors.push(tempCol.r, tempCol.g, tempCol.b);
      }
    }

    for (let ix = 0; ix < subdiv; ix++) {
      for (let iz = 0; iz < subdiv; iz++) {
        const stride = subdiv + 1;
        const i0 = ix * stride + iz;
        const i1 = (ix + 1) * stride + iz;
        const i2 = (ix + 1) * stride + (iz + 1);
        const i3 = ix * stride + (iz + 1);

        mIndices.push(i0, i2, i1);
        mIndices.push(i0, i3, i2);
      }
    }

    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.Float32BufferAttribute(mVerts, 3));
    mGeo.setAttribute('color', new THREE.Float32BufferAttribute(mColors, 3));
    mGeo.setIndex(mIndices);
    mGeo.computeVertexNormals();

    // 2. Soil Side Walls (4 edges)
    const wVerts: number[] = [];
    const wUvs: number[] = [];
    const wIndices: number[] = [];

    const addWall = (x1: number, z1: number, x2: number, z2: number) => {
      const baseIdx = wVerts.length / 3;
      for (let step = 0; step <= subdiv; step++) {
        const t = step / subdiv;
        const wx = x1 + (x2 - x1) * t;
        const wz = z1 + (z2 - z1) * t;
        const topH = getTerrainElevation(wx, wz).height;

        // Top vertex (local to group)
        wVerts.push(wx - cx, topH, wz - cz);
        wUvs.push(t, 1);

        // Bottom vertex
        wVerts.push(wx - cx, bottomY, wz - cz);
        wUvs.push(t, 0);

        if (step < subdiv) {
          const idx = baseIdx + step * 2;
          wIndices.push(idx, idx + 2, idx + 1);
          wIndices.push(idx + 1, idx + 2, idx + 3);
        }
      }
    };

    // 4 borders: North, East, South, West
    addWall(xMin, zMin, xMin + tileSize, zMin);
    addWall(xMin + tileSize, zMin, xMin + tileSize, zMin + tileSize);
    addWall(xMin + tileSize, zMin + tileSize, xMin, zMin + tileSize);
    addWall(xMin, zMin + tileSize, xMin, zMin);

    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wVerts, 3));
    wGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUvs, 2));
    wGeo.setIndex(wIndices);
    wGeo.computeVertexNormals();

    return { meadowGeo: mGeo, wallsGeo: wGeo };
  }, [cx, cz, tileSize, bottomY]);

  // Clean up geometries on unmount
  useEffect(() => {
    return () => {
      meadowGeo.dispose();
      wallsGeo.dispose();
    };
  }, [meadowGeo, wallsGeo]);

  // Water splash trigger helper
  const triggerWaterSplash = () => {
    soundManager.playWaterSplash();
    hapticSuccess();

    const newParticles: Particle[] = [];
    const waterColor = new THREE.Color('#38BDF8');
    const goldColor = new THREE.Color('#FBBF24');
    const emeraldColor = new THREE.Color('#34D399');

    // 24 Water Splash Droplets
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = 0.8 + Math.random() * 1.4;
      const radius = tileSize * 0.45;
      newParticles.push({
        x: Math.cos(angle) * radius,
        y: 0.05,
        z: Math.sin(angle) * radius,
        vx: Math.cos(angle) * speed,
        vy: 1.8 + Math.random() * 1.2,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.35,
        size: 0.05 + Math.random() * 0.04,
        color: Math.random() > 0.3 ? waterColor : new THREE.Color('#E0F2FE'),
      });
    }

    // 16 Golden & Emerald Earth Flecks
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (tileSize * 0.4);
      newParticles.push({
        x: Math.cos(angle) * dist,
        y: 0.2,
        z: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1.4 + Math.random() * 1.0,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.4,
        size: 0.04 + Math.random() * 0.03,
        color: Math.random() > 0.5 ? goldColor : emeraldColor,
      });
    }

    particleListRef.current = newParticles;
  };

  // Particle points geometry buffer
  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 48;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => particleGeo.dispose();
  }, [particleGeo]);

  // Spring physics & particle simulation loop
  useFrame((_, delta) => {
    if (isSettledRef.current) return;

    const dt = Math.min(delta, 0.05);

    // Spring mechanics: target is 0.0
    const springK = 34; // Spring stiffness
    const damping = 9.2; // Damping ratio
    const currentY = yRef.current;
    const currentVel = velRef.current;

    const force = -springK * currentY - damping * currentVel;
    const newVel = currentVel + force * dt;
    const newY = currentY + newVel * dt;

    yRef.current = newY;
    velRef.current = newVel;

    if (groupRef.current) {
      groupRef.current.position.y = newY;
    }

    // Trigger splash once as block emerges past water level (-0.15)
    if (!hasTriggeredSplash.current && newY >= -0.15) {
      hasTriggeredSplash.current = true;
      triggerWaterSplash();
    }

    // Check if settled
    if (
      hasTriggeredSplash.current &&
      Math.abs(newY) < 0.005 &&
      Math.abs(newVel) < 0.04
    ) {
      isSettledRef.current = true;
      if (groupRef.current) {
        groupRef.current.position.y = 0;
      }
      onSettled(coordKey);
    }

    // Update particles if any without triggering React component re-renders
    const activeParticles = particleListRef.current;
    if (activeParticles.length > 0 && particlesRef.current) {
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particleGeo.getAttribute('color') as THREE.BufferAttribute;

      const gravity = 4.2;
      let hasLiving = false;

      for (let i = 0; i < activeParticles.length; i++) {
        const p = activeParticles[i];
        p.life += dt;
        if (p.life < p.maxLife) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= gravity * dt;

          posAttr.setXYZ(i, p.x, p.y, p.z);
          colAttr.setXYZ(i, p.color.r, p.color.g, p.color.b);
          hasLiving = true;
        } else {
          // Hide dead particle below sea
          posAttr.setXYZ(i, 0, -10, 0);
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      if (!hasLiving) {
        particleListRef.current = [];
      }
    }
  });

  return (
    <group position={[cx, 0, cz]}>
      {/* Animated Rising Tile Mesh */}
      <group ref={groupRef} position={[0, -1.25, 0]}>
        {/* Top Meadow */}
        <mesh geometry={meadowGeo} receiveShadow castShadow>
          <meshStandardMaterial
            vertexColors
            roughness={0.78}
            metalness={0.06}
            shadowSide={THREE.DoubleSide}
          />
        </mesh>

        {/* Soil Walls */}
        <mesh geometry={wallsGeo} receiveShadow castShadow>
          <meshStandardMaterial
            map={soilTexture || undefined}
            color="#BA8E5E"
            roughness={0.88}
            metalness={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Golden Crown Pulse Glow on Edge */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[tileSize * 0.98, tileSize * 0.98]} />
          <meshBasicMaterial
            color="#34D399"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Water Splash & Gold Earth Particles */}
      <points ref={particlesRef} geometry={particleGeo}>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
