'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game/useGameStore';
import { checkFaunaEligibility, isFlowerOrBush } from '@/lib/game/faunaRules';
import { gridToWorld, getUnlockedTilesSet, isTileOccupied } from '@/lib/game/worldRules';
import { FaunaSpecies, WorldObject } from '@/types/game';
import { soundManager } from '@/lib/audio/sounds';

// Preload 3D GLB animal models
useGLTF.preload('/models/fauna_reindeer.glb');
useGLTF.preload('/models/fauna_bee.glb');
useGLTF.preload('/models/fauna_fox.glb');
useGLTF.preload('/models/fauna_koala.glb');

// ============================================================================
// FLOATING HEART REACTION (Spawns when animal is clicked/greeted)
// ============================================================================
interface HeartParticle {
  id: number;
  position: [number, number, number];
}

function FloatingHeart({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ageRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    ageRef.current += delta;
    const elapsed = ageRef.current;
    // Rise and expand, then fade
    meshRef.current.position.y = position[1] + elapsed * 0.9;
    meshRef.current.position.x = position[0] + Math.sin(elapsed * 6) * 0.1;
    meshRef.current.position.z = position[2] + Math.cos(elapsed * 6) * 0.1;
    const scale = Math.max(0, (1 - elapsed / 1.6) * 0.35);
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#F43F5E" transparent opacity={0.9} />
    </mesh>
  );
}

// ============================================================================
// 1. HONEY BEE (Multi-flower pollinator - Agile figure-8 buzz between blossoms)
// ============================================================================
interface HoneyBeeProps {
  centers: [number, number, number][];
  speed: number;
  radius: number;
  phaseOffset: number;
  onSelect: () => void;
}

function HoneyBee({ centers, speed, radius, phaseOffset, onSelect }: HoneyBeeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_bee.glb');

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current || centers.length === 0) return;
    const t = clock.getElapsedTime() * speed + phaseOffset;
    const count = centers.length;

    // Shift flower anchor every ~8 seconds
    const flowerIdx = Math.floor(t / 8.0) % count;
    const nextFlowerIdx = (flowerIdx + 1) % count;
    const progressInCycle = (t % 8.0) / 8.0;

    const fA = centers[flowerIdx];
    const fB = centers[nextFlowerIdx];

    let cx = fA[0];
    let cy = fA[1];
    let cz = fA[2];

    if (progressInCycle > 0.65) {
      // Smooth travel transition between flowers
      const transProg = (progressInCycle - 0.65) / 0.35;
      const smooth = transProg * transProg * (3 - 2 * transProg);
      cx = fA[0] + (fB[0] - fA[0]) * smooth;
      cy = fA[1] + (fB[1] - fA[1]) * smooth + Math.sin(transProg * Math.PI) * 0.2;
      cz = fA[2] + (fB[2] - fA[2]) * smooth;
    }

    // Lively figure-8 flight around current flower
    const x = cx + Math.sin(t * 1.4) * radius;
    const z = cz + Math.sin(t * 2.8) * (radius * 0.7);
    const y = cy + 0.32 + Math.sin(t * 5.5) * 0.08;
    groupRef.current.position.set(x, y, z);

    // Orient forward in direction of motion
    const dx = Math.cos(t * 1.4) * radius * 1.4;
    const dz = Math.cos(t * 2.8) * (radius * 0.7) * 2.8;
    groupRef.current.rotation.y = Math.atan2(dx, dz);

    // Banking tilt into curves and lively wing buzz
    groupRef.current.rotation.z = -dx * 0.35;
    groupRef.current.rotation.x = Math.sin(t * 12) * 0.08;
  });

  return (
    <group
      ref={groupRef}
      scale={0.18}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 2. SONGBIRD (Lively chubby songbird with flight gliding & branch perches)
// ============================================================================
interface SongbirdProps {
  waypoints: [number, number, number][];
  onSelect: () => void;
}

function Songbird({ waypoints, onSelect }: SongbirdProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  // Flight cycle timing: 5s perching & pecking, 2.5s graceful flight glide
  const PERCH_DUR = 5.0;
  const FLIGHT_DUR = 2.5;
  const CYCLE_DUR = PERCH_DUR + FLIGHT_DUR;

  useFrame(({ clock }) => {
    if (!groupRef.current || waypoints.length === 0) return;

    const t = clock.getElapsedTime();
    const count = waypoints.length;
    const currentWaypointIndex = Math.floor(t / CYCLE_DUR) % count;
    const nextWaypointIndex = (currentWaypointIndex + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = waypoints[currentWaypointIndex];
    const pB = waypoints[nextWaypointIndex];

    if (timeInCycle < PERCH_DUR) {
      // -------------------------------------------------------------
      // STATE 1: PERCHED (Resting on branch or grass, pecking, head turns)
      // -------------------------------------------------------------
      const hopCycle = (timeInCycle * 2.0) % 3.0;
      let hopY = 0;
      let hopRotX = 0;

      if (hopCycle < 0.4) {
        // Quick branch hop
        const prog = hopCycle / 0.4;
        hopY = Math.sin(prog * Math.PI) * 0.06;
        hopRotX = Math.sin(prog * Math.PI) * 0.1;
        const wingFlutter = Math.sin(t * 26) * 0.22;
        if (leftWingRef.current) leftWingRef.current.rotation.z = -0.2 - wingFlutter;
        if (rightWingRef.current) rightWingRef.current.rotation.z = 0.2 + wingFlutter;
      } else {
        // Folded resting wings
        if (leftWingRef.current) leftWingRef.current.rotation.z = -0.2;
        if (rightWingRef.current) rightWingRef.current.rotation.z = 0.2;
      }

      groupRef.current.position.set(
        pA[0],
        pA[1] + hopY + Math.sin(t * 2.5) * 0.008,
        pA[2]
      );
      groupRef.current.rotation.x = hopRotX;
      groupRef.current.rotation.z = 0;

      // Orient naturally on the perch
      const dx = pB[0] - pA[0];
      const dz = pB[2] - pA[2];
      groupRef.current.rotation.y = Math.atan2(dx, dz) * 0.5 + 0.4;

      if (headRef.current) {
        // Saccadic curious bird head turns
        const headTurnStep = Math.floor(t * 1.4);
        headRef.current.rotation.y = Math.sin(headTurnStep * 1.7) * 0.55;
        // Pecking dip
        const peckCycle = Math.sin(t * 3.0);
        headRef.current.rotation.x = peckCycle > 0.4 ? -(peckCycle - 0.4) * 0.45 : 0;
      }

      if (tailRef.current) {
        tailRef.current.rotation.x = -0.55 + Math.sin(t * 5.0) * 0.12;
      }
    } else {
      // -------------------------------------------------------------
      // STATE 2: ACTIVE FLIGHT (Gliding arc with energetic flapping)
      // -------------------------------------------------------------
      const flightProgress = (timeInCycle - PERCH_DUR) / FLIGHT_DUR; // 0..1
      const smoothProg = flightProgress * flightProgress * (3 - 2 * flightProgress);

      const dx = pB[0] - pA[0];
      const dz = pB[2] - pA[2];
      const currentX = pA[0] + dx * smoothProg;
      const currentZ = pA[2] + dz * smoothProg;

      // Graceful parabolic arc in the air (climbing above canopies then swooping down)
      const arcHeight = Math.sin(flightProgress * Math.PI) * 0.45;
      const currentY = pA[1] + (pB[1] - pA[1]) * smoothProg + arcHeight;

      groupRef.current.position.set(currentX, currentY, currentZ);

      // Travel orientation
      const travelRotY = Math.atan2(dx, dz);
      groupRef.current.rotation.y = travelRotY;

      // Pitch up on climb, pitch down on glide descent
      const pitch = Math.cos(flightProgress * Math.PI) * 0.22;
      groupRef.current.rotation.x = -pitch;

      // Roll bank into curves
      groupRef.current.rotation.z = -Math.sin(travelRotY) * 0.15;

      // Vigorous wing flapping while in mid-air flight!
      const wingFlap = Math.sin(t * 32) * 0.55;
      if (leftWingRef.current) leftWingRef.current.rotation.z = -0.2 - wingFlap;
      if (rightWingRef.current) rightWingRef.current.rotation.z = 0.2 + wingFlap;

      if (headRef.current) headRef.current.rotation.set(0, 0, 0);
      if (tailRef.current) tailRef.current.rotation.x = -0.3;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={0.48}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Plump Chubby Body (Vibrant Azure-Robin) */}
      <mesh position={[0, 0, 0]} scale={[1, 0.95, 1.15]} castShadow>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#0284C7" roughness={0.5} />
      </mesh>

      {/* Warm Cream Soft Breast & Belly */}
      <mesh position={[0, -0.02, 0.05]} scale={[0.9, 0.85, 0.9]}>
        <sphereGeometry args={[0.095, 12, 12]} />
        <meshStandardMaterial color="#FEF3C7" roughness={0.4} />
      </mesh>

      {/* Left Folded/Flapping Wing */}
      <mesh
        ref={leftWingRef}
        position={[-0.1, 0.01, -0.01]}
        rotation={[0.2, 0.1, -0.2]}
        castShadow
      >
        <capsuleGeometry args={[0.038, 0.1, 4, 8]} />
        <meshStandardMaterial color="#0369A1" roughness={0.6} />
      </mesh>

      {/* Right Folded/Flapping Wing */}
      <mesh
        ref={rightWingRef}
        position={[0.1, 0.01, -0.01]}
        rotation={[0.2, -0.1, 0.2]}
        castShadow
      >
        <capsuleGeometry args={[0.038, 0.1, 4, 8]} />
        <meshStandardMaterial color="#0369A1" roughness={0.6} />
      </mesh>

      {/* Round Head Group */}
      <group ref={headRef} position={[0, 0.11, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color="#0284C7" roughness={0.5} />
        </mesh>
        {/* Tiny Golden Amber Beak */}
        <mesh position={[0, -0.01, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.06, 8]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.3} />
        </mesh>
        {/* Bead Eyes */}
        <mesh position={[-0.045, 0.025, 0.05]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
        <mesh position={[0.045, 0.025, 0.05]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* Soft Tail Feathers */}
      <mesh ref={tailRef} position={[0, -0.04, -0.13]} rotation={[-0.55, 0, 0]}>
        <boxGeometry args={[0.065, 0.13, 0.018]} />
        <meshStandardMaterial color="#075985" roughness={0.6} />
      </mesh>

      {/* Little Amber Feet gripping branch */}
      <mesh position={[-0.035, -0.11, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.05, 5]} />
        <meshStandardMaterial color="#D97706" roughness={0.4} />
      </mesh>
      <mesh position={[0.035, -0.11, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.05, 5]} />
        <meshStandardMaterial color="#D97706" roughness={0.4} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 3. MEADOW BUNNY (Autonomous hopping between tiles with ear twitches & foraging)
// ============================================================================
interface MeadowBunnyProps {
  roamingTiles: [number, number, number][];
  onSelect: () => void;
}

function MeadowBunny({ roamingTiles, onSelect }: MeadowBunnyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);

  const IDLE_DUR = 6.0;
  const HOP_DUR = 3.0;
  const CYCLE_DUR = IDLE_DUR + HOP_DUR;

  useFrame(({ clock }) => {
    if (!groupRef.current || roamingTiles.length === 0) return;

    const t = clock.getElapsedTime();
    const count = roamingTiles.length;
    const currentIdx = Math.floor(t / CYCLE_DUR) % count;
    const nextIdx = (currentIdx + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = roamingTiles[currentIdx];
    const pB = roamingTiles[nextIdx];

    if (timeInCycle < IDLE_DUR) {
      // Resting, snacking, and looking around at tile A
      groupRef.current.position.set(pA[0], pA[1] + 0.02, pA[2]);
      groupRef.current.rotation.x = 0;

      // Gentle turns while sniffing
      const turnStep = Math.floor(timeInCycle * 0.7);
      groupRef.current.rotation.y = Math.sin(turnStep * 1.5) * 0.45;
    } else {
      // Hopping sequence towards tile B (3 distinct hops)
      const hopProgress = (timeInCycle - IDLE_DUR) / HOP_DUR; // 0..1
      const subHop = (hopProgress * 3.0) % 1.0;
      const hopY = Math.sin(subHop * Math.PI) * 0.16;

      const currentX = pA[0] + (pB[0] - pA[0]) * hopProgress;
      const currentZ = pA[2] + (pB[2] - pA[2]) * hopProgress;

      groupRef.current.position.set(currentX, pA[1] + 0.02 + hopY, currentZ);
      groupRef.current.rotation.x = Math.sin(subHop * Math.PI) * 0.18;

      // Orient towards destination tile
      const dx = pB[0] - pA[0];
      const dz = pB[2] - pA[2];
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    // Ear wiggles during idle
    if (leftEarRef.current && rightEarRef.current) {
      const earWiggle = Math.sin(t * 8) * 0.1;
      leftEarRef.current.rotation.z = -0.15 + earWiggle;
      rightEarRef.current.rotation.z = 0.15 - earWiggle;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={0.58}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Bunny Body */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#FAF5FF" roughness={0.7} />
      </mesh>

      {/* Head */}
      <group position={[0, 0.26, 0.1]}>
        <mesh castShadow>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color="#FAF5FF" roughness={0.7} />
        </mesh>
        {/* Pink Nose */}
        <mesh position={[0, -0.02, 0.11]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshStandardMaterial color="#FB7185" roughness={0.4} />
        </mesh>
        {/* Bead Eyes */}
        <mesh position={[-0.07, 0.03, 0.07]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0.07, 0.03, 0.07]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>

        {/* Long Ears */}
        <mesh ref={leftEarRef} position={[-0.05, 0.16, 0]} rotation={[0, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.22, 6]} />
          <meshStandardMaterial color="#FAF5FF" roughness={0.7} />
        </mesh>
        <mesh ref={rightEarRef} position={[0.05, 0.16, 0]} rotation={[0, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.22, 6]} />
          <meshStandardMaterial color="#FAF5FF" roughness={0.7} />
        </mesh>
      </group>

      {/* Fluffy Tail */}
      <mesh position={[0, 0.12, -0.16]}>
        <sphereGeometry args={[0.055, 6, 6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 4. FOREST FOX (Kenney Cube Pets animal-fox.glb - Agile trotting patrol)
// ============================================================================
interface ForestFoxProps {
  roamingTiles: [number, number, number][];
  onSelect: () => void;
}

function ForestFox({ roamingTiles, onSelect }: ForestFoxProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_fox.glb');

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  const IDLE_DUR = 6.5;
  const WALK_DUR = 3.5;
  const CYCLE_DUR = IDLE_DUR + WALK_DUR;

  useFrame(({ clock }) => {
    if (!groupRef.current || roamingTiles.length === 0) return;

    const t = clock.getElapsedTime();
    const count = roamingTiles.length;
    const currentIdx = Math.floor(t / CYCLE_DUR) % count;
    const nextIdx = (currentIdx + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = roamingTiles[currentIdx];
    const pB = roamingTiles[nextIdx];

    if (timeInCycle < IDLE_DUR) {
      // Alert idle at tile A
      groupRef.current.position.set(pA[0], pA[1] + 0.02, pA[2]);
      // Lively tail wagging & head scanning
      groupRef.current.rotation.y = 0.5 + Math.sin(t * 1.3) * 0.28;
      groupRef.current.rotation.z = Math.sin(t * 2.6) * 0.04;
    } else {
      // Agile trotting stride towards tile B
      const walkProg = (timeInCycle - IDLE_DUR) / WALK_DUR;
      const smoothProg = walkProg * walkProg * (3 - 2 * walkProg);

      const dx = pB[0] - pA[0];
      const dz = pB[2] - pA[2];
      const currentX = pA[0] + dx * smoothProg;
      const currentZ = pA[2] + dz * smoothProg;

      // Trotting bounce
      const trotBob = Math.abs(Math.sin(walkProg * Math.PI * 6)) * 0.035;

      groupRef.current.position.set(currentX, pA[1] + 0.02 + trotBob, currentZ);
      groupRef.current.rotation.y = Math.atan2(dx, dz);
      groupRef.current.rotation.z = Math.sin(walkProg * Math.PI * 6) * 0.04;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={0.38}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 5. TREE KOALA (Kenney Cube Pets animal-koala.glb - Resting on ground near tree)
// ============================================================================
interface TreeKoalaProps {
  basePos: [number, number, number];
  onSelect: () => void;
}

function TreeKoala({ basePos, onSelect }: TreeKoalaProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_koala.glb');

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Sleepy slow breathing on ground
      groupRef.current.position.y = basePos[1] + 0.02 + Math.sin(t * 1.1) * 0.012;
      // Sleepy head nod (dozing forward, then lifting up)
      groupRef.current.rotation.x = Math.sin(t * 0.8) * 0.08;
      groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.04;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[basePos[0], basePos[1] + 0.02, basePos[2]]}
      rotation={[0, 1.1, 0]}
      scale={0.34}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================================
// 6. MYSTIC STAG (Kenney Holiday Kit reindeer.glb - Grounded with Antler Aura)
// ============================================================================
interface MysticStagProps {
  basePos: [number, number, number];
  isNight: boolean;
  onSelect: () => void;
}

function MysticStag({ basePos, isNight, onSelect }: MysticStagProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_reindeer.glb');

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Stately deep breathing & body pulse
      groupRef.current.scale.y = 0.58 * (1 + Math.sin(t * 1.4) * 0.025);
      // Gentle hoof weight shifting
      groupRef.current.position.y = basePos[1] + 0.02 + Math.sin(t * 1.4) * 0.015;
      // Majestic posture turn
      groupRef.current.rotation.y = 0.85 + Math.sin(t * 0.7) * 0.15;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[basePos[0], basePos[1] + 0.02, basePos[2]]}
      rotation={[0, 0.85, 0]}
      scale={0.58}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />

      {/* Bioluminescent Antler Glow Light */}
      <pointLight
        color="#34D399"
        intensity={isNight ? 1.5 : 0.6}
        distance={2.8}
        decay={2}
        position={[0, 0.8, 0.2]}
      />

      {/* Subtle Antler Magic Halo Sphere */}
      <mesh position={[0, 0.82, 0.18]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial
          color="#34D399"
          transparent
          opacity={isNight ? 0.28 : 0.14}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// MAIN FAUNA ECOSYSTEM ROOT COMPONENT
// ============================================================================
export function FaunaEcosystem() {
  const saveData = useGameStore((state) => state.saveData);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const setSelectedFauna = useGameStore((state) => state.setSelectedFauna);
  const isNight = timeOfDay === 'night';

  const [hearts, setHearts] = useState<HeartParticle[]>([]);

  const spawnHeart = (pos: [number, number, number]) => {
    soundManager.playAnimalChirp();
    const newHeart: HeartParticle = {
      id: Date.now() + Math.random(),
      position: [pos[0], pos[1] + 0.6, pos[2]],
    };
    setHearts((prev) => [...prev.slice(-6), newHeart]);

    // Clean up heart after 1.8s
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1800);
  };

  const handleSelectSpecies = (species: FaunaSpecies, pos: [number, number, number]) => {
    spawnHeart(pos);
    setSelectedFauna(species);
  };

  // Eligibility checks
  const canBee = checkFaunaEligibility('bee', saveData, timeOfDay);
  const canBird = checkFaunaEligibility('bird', saveData, timeOfDay);
  const canRabbit = checkFaunaEligibility('rabbit', saveData, timeOfDay);
  const canFox = checkFaunaEligibility('fox', saveData, timeOfDay);
  const canKoala = checkFaunaEligibility('koala', saveData, timeOfDay);
  const canStag = checkFaunaEligibility('mystic_stag', saveData, timeOfDay);

  const worldObjects = saveData.world_objects || [];
  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(saveData.world, worldObjects),
    [saveData.world, worldObjects]
  );

  // --------------------------------------------------------------------------
  // SPATIAL DISPERSION ALGORITHM: Disperse animals across distinct quadrants
  // --------------------------------------------------------------------------
  const { unoccupiedTiles, activeTrees, flowers } = useMemo(() => {
    const empty: [number, number, [number, number, number]][] = [];
    const trees: WorldObject[] = [];
    const flws: WorldObject[] = [];

    worldObjects.forEach((obj) => {
      if (obj.object_type === 'tree' && obj.status === 'active') {
        trees.push(obj);
      } else if (isFlowerOrBush(obj)) {
        flws.push(obj);
      }
    });

    for (const key of Array.from(unlockedSet)) {
      const [gx, gy] = key.split(',').map(Number);
      if (!isTileOccupied(gx, gy, worldObjects)) {
        empty.push([gx, gy, gridToWorld(gx, gy)]);
      }
    }

    return { unoccupiedTiles: empty, activeTrees: trees, flowers: flws };
  }, [unlockedSet, worldObjects]);

  // 1. Honey Bee flower targets
  const beeCenters = useMemo<[number, number, number][]>(() => {
    if (flowers.length > 0) {
      return flowers.map((f) => gridToWorld(f.grid_x, f.grid_y));
    }
    // Fallback: 2 distinct grassy lawn points
    return [
      gridToWorld(4, 4),
      gridToWorld(5, 4),
    ];
  }, [flowers]);

  // 2. Songbird Waypoints (Tree branches at y = 0.72 - 0.85 + ground pecking spots)
  const birdWaypoints = useMemo<[number, number, number][]>(() => {
    const points: [number, number, number][] = [];

    // Tree branch perches
    activeTrees.forEach((t) => {
      const w = gridToWorld(t.grid_x, t.grid_y);
      // Place bird right inside tree branch foliage at y = 0.72, NOT high up in the sky
      points.push([w[0] + 0.18, w[1] + 0.72, w[2] + 0.16]);
    });

    // Add ground/foraging perches so bird swoops down to feed on grass
    if (unoccupiedTiles.length > 0) {
      const sample1 = unoccupiedTiles[0][2];
      points.push([sample1[0] + 0.15, sample1[1] + 0.18, sample1[2] + 0.15]);
      if (unoccupiedTiles.length > 2) {
        const sample2 = unoccupiedTiles[unoccupiedTiles.length - 1][2];
        points.push([sample2[0] - 0.15, sample2[1] + 0.18, sample2[2] - 0.15]);
      }
    }

    if (points.length === 0) {
      return [[0, 0.72, 0], [1.2, 0.18, 0], [-1.2, 0.72, 1.2]];
    }
    if (points.length === 1) {
      // Add a scenic swing point
      const p = points[0];
      return [p, [p[0] + 1.2, 0.2, p[2] + 0.8], [p[0] - 0.8, 0.65, p[2] - 0.8]];
    }
    return points;
  }, [activeTrees, unoccupiedTiles]);

  // 3. Meadow Bunny Roaming Tiles (Southwest sector)
  const bunnyRoamingTiles = useMemo<[number, number, number][]>(() => {
    const swCandidates = unoccupiedTiles
      .filter(([gx, gy]) => gx <= 4 && gy <= 4)
      .map((item) => item[2]);

    if (swCandidates.length >= 2) return swCandidates.slice(0, 4);

    // Fallback: take first 2-3 unoccupied tiles
    if (unoccupiedTiles.length > 0) {
      return unoccupiedTiles.slice(0, 3).map((item) => item[2]);
    }
    return [gridToWorld(3, 3), gridToWorld(4, 3)];
  }, [unoccupiedTiles]);

  // 4. Forest Fox Roaming Tiles (Northeast / perimeter sector)
  const foxRoamingTiles = useMemo<[number, number, number][]>(() => {
    const neCandidates = unoccupiedTiles
      .filter(([gx, gy]) => gx >= 5 || gy >= 5)
      .map((item) => item[2]);

    if (neCandidates.length >= 2) return neCandidates.slice(0, 4);

    // Fallback: take tiles from end of list to avoid overlap with bunny
    if (unoccupiedTiles.length >= 3) {
      return unoccupiedTiles.slice(-3).map((item) => item[2]);
    }
    return [gridToWorld(5, 5), gridToWorld(4, 5)];
  }, [unoccupiedTiles]);

  // 5. Tree Koala Position (Resting on grass near base of a lush tree)
  const koalaGroundPos = useMemo<[number, number, number]>(() => {
    if (activeTrees.length > 0) {
      // Pick oak or first available tree
      const target =
        activeTrees.find(
          (t) =>
            t.species === 'ancient' ||
            t.species === 'oak' ||
            (t.model_variant || '').includes('oak')
        ) || activeTrees[0];
      const w = gridToWorld(target.grid_x, target.grid_y);
      return [w[0] + 0.32, w[1], w[2] + 0.3];
    }
    if (unoccupiedTiles.length > 1) {
      return unoccupiedTiles[1][2];
    }
    return gridToWorld(4, 4);
  }, [activeTrees, unoccupiedTiles]);

  // 6. Mystic Stag Position (Dedicated serene corner of unlocked territory)
  const stagPos = useMemo<[number, number, number]>(() => {
    const cornerTiles: [number, number][] = [
      [3, 3], [5, 3], [3, 5], [5, 5],
      [2, 3], [3, 2], [6, 4], [4, 6],
    ];

    for (const [gx, gy] of cornerTiles) {
      if (unlockedSet.has(`${gx},${gy}`) && !isTileOccupied(gx, gy, worldObjects)) {
        return gridToWorld(gx, gy);
      }
    }

    if (unoccupiedTiles.length > 0) {
      return unoccupiedTiles[Math.floor(unoccupiedTiles.length / 2)][2];
    }
    return gridToWorld(4, 4);
  }, [unlockedSet, worldObjects, unoccupiedTiles]);

  return (
    <group name="fauna-ecosystem">
      {/* 1. Honey Bees */}
      {canBee && (
        <group name="fauna-bees">
          <HoneyBee
            centers={beeCenters}
            speed={1.1}
            radius={0.65}
            phaseOffset={0}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
          <HoneyBee
            centers={beeCenters}
            speed={1.3}
            radius={0.5}
            phaseOffset={Math.PI}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
        </group>
      )}

      {/* 2. Songbird with dynamic flight gliding & canopy perches */}
      {canBird && (
        <Songbird
          waypoints={birdWaypoints}
          onSelect={() => handleSelectSpecies('bird', birdWaypoints[0])}
        />
      )}

      {/* 3. Meadow Bunny with autonomous tile-hopping */}
      {canRabbit && (
        <MeadowBunny
          roamingTiles={bunnyRoamingTiles}
          onSelect={() => handleSelectSpecies('rabbit', bunnyRoamingTiles[0])}
        />
      )}

      {/* 4. Forest Fox with perimeter trotting patrol */}
      {canFox && (
        <ForestFox
          roamingTiles={foxRoamingTiles}
          onSelect={() => handleSelectSpecies('fox', foxRoamingTiles[0])}
        />
      )}

      {/* 5. Tree Koala resting peacefully at tree base */}
      {canKoala && (
        <TreeKoala
          basePos={koalaGroundPos}
          onSelect={() => handleSelectSpecies('koala', koalaGroundPos)}
        />
      )}

      {/* 6. Mystic Stag grounded on spacious island corner */}
      {canStag && (
        <MysticStag
          basePos={stagPos}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('mystic_stag', stagPos)}
        />
      )}

      {/* Floating 3D Hearts on Tap */}
      {hearts.map((h) => (
        <FloatingHeart key={h.id} position={h.position} />
      ))}
    </group>
  );
}
