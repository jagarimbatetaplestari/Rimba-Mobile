'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '@/lib/game/useGameStore';
import { getLevelFromXp } from '@/lib/game/levelRules';
import { CELESTIAL_ISLAND_LEVEL_REQUIRED } from '@/lib/game/config';
import { soundManager } from '@/lib/audio/sounds';
import { hapticLight } from '@/lib/mobile/nativeBridge';

// Preload models for the satellite sanctuary
useGLTF.preload('/models/block-grass-low.glb');
useGLTF.preload('/models/block-snow-low.glb');
useGLTF.preload('/models/path_wood.glb');
useGLTF.preload('/models/path_stone.glb');
useGLTF.preload('/models/tree_detailed.glb');
useGLTF.preload('/models/rock_tallA.glb');

/**
 * ☁️ Soft Volumetric Cloud Wisp
 */
function FloatingCloudWisp({
  position,
  scale = 1.0,
  speed = 0.4,
}: {
  position: [number, number, number];
  scale?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed;
    meshRef.current.position.y = position[1] + Math.sin(t) * 0.08;
    meshRef.current.rotation.y = t * 0.2;
  });

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial
          color="#F1F5F9"
          roughness={0.9}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.35, -0.05, 0.15]}>
        <sphereGeometry args={[0.42, 10, 10]} />
        <meshStandardMaterial
          color="#F8FAFC"
          roughness={0.9}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.32, -0.08, -0.1]}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshStandardMaterial
          color="#F8FAFC"
          roughness={0.9}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * 🏮 Ancient Celestial Shrine Beacon
 */
function ShrineBeacon({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    lightRef.current.intensity = 0.75 + Math.sin(t * 3.0) * 0.2;
  });

  return (
    <group position={position}>
      {/* Stone Pillar */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.10, 0.5, 8]} />
        <meshStandardMaterial color="#64748B" roughness={0.8} />
      </mesh>
      {/* Lantern Housing */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial
          color="#F59E0B"
          emissive="#D97706"
          emissiveIntensity={0.8}
          roughness={0.4}
        />
      </mesh>
      {/* Roof Cap */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <coneGeometry args={[0.18, 0.12, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Warm Ambient Glow */}
      <pointLight
        ref={lightRef}
        position={[0, 0.55, 0]}
        color="#FDE68A"
        intensity={0.8}
        distance={2.5}
        decay={2}
      />
    </group>
  );
}

/**
 * 🌉 Arch Bridge Connecting Main Island to Celestial Satellite
 */
function CelestialArchBridge({ activeBiome }: { activeBiome: string }) {
  const isSnow = activeBiome === 'snow';
  const plankColor = isSnow ? '#94A3B8' : '#854D0E';
  const stoneColor = '#64748B';

  const planks = useMemo(() => {
    // 7 bridge segments forming an arched span from x = 4.3 to 6.3
    const list = [];
    const steps = 7;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1); // 0.0 to 1.0
      const x = THREE.MathUtils.lerp(4.35, 6.25, t);
      // Gentle parabolic arch: peak in the middle
      const arc = Math.sin(t * Math.PI) * 0.22;
      const y = THREE.MathUtils.lerp(0.08, 0.50, t) + arc;
      const z = THREE.MathUtils.lerp(0.0, -0.4, t);
      const angleZ = Math.cos(t * Math.PI) * -0.22;
      list.push({ pos: [x, y, z] as [number, number, number], rotZ: angleZ });
    }
    return list;
  }, []);

  return (
    <group>
      {/* Bridge Wooden Deck Planks */}
      {planks.map((item, idx) => (
        <group key={`bridge_${idx}`} position={item.pos} rotation={[0, 0.15, item.rotZ]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.26, 0.05, 0.72]} />
            <meshStandardMaterial color={plankColor} roughness={0.78} />
          </mesh>
          {/* Side Ropes / Railings */}
          <mesh position={[0, 0.15, 0.34]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
            <meshStandardMaterial color="#713F12" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, -0.34]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
            <meshStandardMaterial color="#713F12" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Stone Pillars Anchoring Bridge at Both Ends */}
      <mesh position={[4.25, -0.15, 0.0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.6, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>
      <mesh position={[6.35, 0.15, -0.4]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.6, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Structural Bridge Support Pillars & Braces (Tiang Penyangga Tengah & Penopang Tebing) */}
      {/* 1. Main Central Stone Pier down to the cliff base */}
      <mesh position={[5.25, -0.32, -0.18]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.15, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.9} />
      </mesh>
      {/* Central pier capital stone cap supporting the arch */}
      <mesh position={[5.25, 0.24, -0.18]} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.74]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* 2. Timber Struts / Diagonal Support Braces (Penopang Miring) */}
      <mesh position={[4.82, 0.10, -0.10]} rotation={[0, 0.15, 0.52]} castShadow>
        <boxGeometry args={[0.07, 0.48, 0.07]} />
        <meshStandardMaterial color={plankColor} roughness={0.8} />
      </mesh>
      <mesh position={[5.68, 0.20, -0.26]} rotation={[0, 0.15, -0.45]} castShadow>
        <boxGeometry args={[0.07, 0.50, 0.07]} />
        <meshStandardMaterial color={plankColor} roughness={0.8} />
      </mesh>

      {/* 3. Longitudinal Timber Stringer Beams underneath both edges of the deck */}
      <mesh position={[5.28, 0.25, 0.14]} rotation={[0, 0.15, -0.18]} castShadow>
        <boxGeometry args={[2.05, 0.06, 0.06]} />
        <meshStandardMaterial color="#5C3A21" roughness={0.82} />
      </mesh>
      <mesh position={[5.28, 0.25, -0.50]} rotation={[0, 0.15, -0.18]} castShadow>
        <boxGeometry args={[2.05, 0.06, 0.06]} />
        <meshStandardMaterial color="#5C3A21" roughness={0.82} />
      </mesh>
    </group>
  );
}

/**
 * 🏝️ Floating Satellite Island Component (Level 100 Grand Sanctum)
 */
export function FloatingSatelliteIsland() {
  const xp = useGameStore((state) => state.saveData.profile.xp);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const activeBiome = useGameStore((state) => state.activeBiome);

  const currentLevel = getLevelFromXp(xp);
  const isUnlocked = currentLevel >= CELESTIAL_ISLAND_LEVEL_REQUIRED || devFastMode;

  const islandGroupRef = useRef<THREE.Group>(null);
  const isSnow = activeBiome === 'snow';

  // Floating levitation bob animation
  useFrame(({ clock }) => {
    if (!islandGroupRef.current) return;
    const t = clock.getElapsedTime();
    islandGroupRef.current.position.y = 0.52 + Math.sin(t * 0.75) * 0.045;
  });

  const { scene: blockScene } = useGLTF(
    isSnow ? '/models/block-snow-low.glb' : '/models/block-grass-low.glb'
  );
  const { scene: treeScene } = useGLTF('/models/tree_detailed.glb');

  // Turf color matching active biome
  const turfColor = useMemo(() => {
    switch (activeBiome) {
      case 'autumn':
        return '#D98A3B';
      case 'snow':
        return '#F8F8FB';
      case 'lotus':
        return '#4BA388';
      case 'meadow':
      default:
        return '#5AC487';
    }
  }, [activeBiome]);

  // Leaf color for celestial central bonsai
  const celestialLeafColor = useMemo(() => {
    switch (activeBiome) {
      case 'autumn':
        return '#F97316';
      case 'snow':
        return '#E2E8F0';
      case 'lotus':
        return '#F472B6'; // Pink Sakura Cherry Blossom
      case 'meadow':
      default:
        return '#34D399'; // Emerald Jade
    }
  }, [activeBiome]);

  const clonedBonsai = useMemo(() => {
    const cloned = treeScene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (mat.name.toLowerCase().includes('leaf') || (mat.color && mat.color.g > 0.5)) {
            mat.color = new THREE.Color(celestialLeafColor);
          }
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [treeScene, celestialLeafColor]);

  // 7 cluster block coordinates forming an organic hexagonal satellite island
  const islandTiles: [number, number, number][] = useMemo(() => {
    return [
      [0, -0.5, 0],       // Center
      [1.0, -0.5, 0],     // East
      [-1.0, -0.5, 0],    // West
      [0.5, -0.5, 0.86],  // South East
      [-0.5, -0.5, 0.86], // South West
      [0.5, -0.5, -0.86], // North East
      [-0.5, -0.5, -0.86],// North West
    ];
  }, []);

  if (!isUnlocked) {
    return null;
  }

  const handleIslandClick = () => {
    soundManager.playPop();
    hapticLight();
    // Dispatch custom event for camera to smoothly frame the celestial island
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rimba:camera_focus_target', {
          detail: { position: [7.5, 0.55, -0.4], distance: 7.0 },
        })
      );
    }
  };

  return (
    <group position={[7.5, 0.52, -0.4]}>
      {/* 🌉 Connecting Arch Bridge */}
      <CelestialArchBridge activeBiome={activeBiome} />

      {/* 🏝️ Floating Satellite Island Group */}
      <group
        ref={islandGroupRef}
        onClick={(e) => {
          e.stopPropagation();
          handleIslandClick();
        }}
      >
        {/* Hexagonal Modular Land Blocks */}
        {islandTiles.map((pos, idx) => (
          <primitive
            key={`celestial_block_${idx}`}
            object={blockScene.clone(true)}
            position={pos}
            scale={[1.0, 1.0, 1.0]}
          />
        ))}

        {/* Seamless Turf Disk Overlay */}
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.42, 28]} />
          <meshStandardMaterial
            color={turfColor}
            roughness={0.88}
            polygonOffset
            polygonOffsetFactor={-1.5}
            polygonOffsetUnits={-1.5}
          />
        </mesh>

        {/* Central Ancient Celestial Bonsai */}
        <primitive
          object={clonedBonsai}
          position={[0, 0.01, 0]}
          scale={[0.82, 0.82, 0.82]}
        />

        {/* 🏮 Two Stone Beacons flanking the Bonsai */}
        <ShrineBeacon position={[-0.75, 0.01, 0.45]} />
        <ShrineBeacon position={[0.75, 0.01, -0.45]} />

        {/* Floating Clouds hovering below the abyss */}
        <FloatingCloudWisp position={[0, -0.9, 0]} scale={1.4} speed={0.3} />
        <FloatingCloudWisp position={[-1.2, -1.1, 0.6]} scale={1.1} speed={0.4} />
        <FloatingCloudWisp position={[1.1, -1.0, -0.7]} scale={1.2} speed={0.35} />
      </group>
    </group>
  );
}
