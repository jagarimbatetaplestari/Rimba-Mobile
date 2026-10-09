'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game/useGameStore';
import { checkFaunaEligibility, isFlowerOrBush } from '@/lib/game/faunaRules';
import {
  gridToWorld,
  getUnlockedTilesSet,
  isTileOccupied,
  getTerrainElevation,
} from '@/lib/game/worldRules';
import { buildRiverTileMap, getRiverChannelDistance, getConnectedRiverPatrolPaths } from '@/lib/game/riverSystem';
import { GAME_CONFIG } from '@/lib/game/config';
import { FaunaSpecies, WorldObject } from '@/types/game';
import { soundManager } from '@/lib/audio/sounds';

// Preload 3D GLB animal models
useGLTF.preload('/models/animal-deer.glb');
useGLTF.preload('/models/fauna_bee.glb');
useGLTF.preload('/models/fauna_fox.glb');
useGLTF.preload('/models/fauna_koala.glb');
useGLTF.preload('/models/animal-elephant.glb');
useGLTF.preload('/models/animal-tiger.glb');
useGLTF.preload('/models/animal-polar.glb');
useGLTF.preload('/models/animal-panda.glb');
useGLTF.preload('/models/animal-monkey.glb');
useGLTF.preload('/models/animal-lion.glb');
useGLTF.preload('/models/animal-hog.glb');
useGLTF.preload('/models/animal-giraffe.glb');
useGLTF.preload('/models/animal-fish.glb');
useGLTF.preload('/models/animal-cat.glb');
useGLTF.preload('/models/animal-beaver.glb');

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
  scale?: number;
  isNight?: boolean;
  onSelect: () => void;
}

function HoneyBee({ centers, speed, radius, phaseOffset, scale = 0.14, isNight = false, onSelect }: HoneyBeeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_bee.glb');

  const beeTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_cubepets.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && beeTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = beeTexture;
          mat.roughness = 0.84;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, beeTexture]);

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
      scale={scale}
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
  bodyColor?: string;
  breastColor?: string;
  wingColor?: string;
  scale?: number;
  phaseOffset?: number;
  isNight?: boolean;
  onSelect: () => void;
}

function Songbird({
  waypoints,
  bodyColor = '#0284C7',
  breastColor = '#FEF3C7',
  wingColor = '#0369A1',
  scale = 0.38,
  phaseOffset = 0,
  isNight = false,
  onSelect,
}: SongbirdProps) {
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

    const t = clock.getElapsedTime() + phaseOffset;

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
      scale={scale}
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
      {/* Plump Chubby Body */}
      <mesh position={[0, 0, 0]} scale={[1, 0.95, 1.15]} castShadow>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>

      {/* Warm Soft Breast & Belly */}
      <mesh position={[0, -0.02, 0.05]} scale={[0.9, 0.85, 0.9]}>
        <sphereGeometry args={[0.095, 12, 12]} />
        <meshStandardMaterial color={breastColor} roughness={0.4} />
      </mesh>

      {/* Left Folded/Flapping Wing */}
      <mesh
        ref={leftWingRef}
        position={[-0.1, 0.01, -0.01]}
        rotation={[0.2, 0.1, -0.2]}
        castShadow
      >
        <capsuleGeometry args={[0.038, 0.1, 4, 8]} />
        <meshStandardMaterial color={wingColor} roughness={0.6} />
      </mesh>

      {/* Right Folded/Flapping Wing */}
      <mesh
        ref={rightWingRef}
        position={[0.1, 0.01, -0.01]}
        rotation={[0.2, -0.1, 0.2]}
        castShadow
      >
        <capsuleGeometry args={[0.038, 0.1, 4, 8]} />
        <meshStandardMaterial color={wingColor} roughness={0.6} />
      </mesh>

      {/* Round Head Group */}
      <group ref={headRef} position={[0, 0.11, 0.05]}>
        <mesh castShadow>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
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
        <meshStandardMaterial color={wingColor} roughness={0.6} />
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
  id?: string;
  furColor?: string;
  scale?: number;
  phaseOffset?: number;
  roamingTiles: [number, number, number][];
  groundPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isRiverZone: (wx: number, wz: number, radius?: number) => boolean;
  isNight?: boolean;
  onSelect: () => void;
}

function MeadowBunny({
  id = 'rabbit',
  furColor = '#FAF5FF',
  scale = 0.46,
  phaseOffset = 0,
  roamingTiles,
  groundPositionsRef,
  isRiverZone,
  isNight = false,
  onSelect,
}: MeadowBunnyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);

  const anchor = roamingTiles[0] || [0, 0, 0];
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(anchor[0], anchor[1], anchor[2]));
  const currentRotY = useRef<number>(phaseOffset);
  const currentRotX = useRef<number>(0);
  const currentRotZ = useRef<number>(0);
  const currentYOffset = useRef<number>(0.02);
  const currentScaleY = useRef<number>(1.0);
  const currentScaleXZ = useRef<number>(1.0);

  const IDLE_DUR = 5.2;
  const STEER_DUR = 0.7;
  const HOP_DUR = 2.7;
  const CYCLE_DUR = IDLE_DUR + STEER_DUR + HOP_DUR;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || roamingTiles.length === 0) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime() + phaseOffset;

    const count = roamingTiles.length;
    const currentIdx = Math.floor(t / CYCLE_DUR) % count;
    const nextIdx = (currentIdx + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = roamingTiles[currentIdx];
    const pB = roamingTiles[nextIdx];

    let targetX = pA[0];
    let targetZ = pA[2];
    let targetRotY = currentRotY.current;
    let targetRotX = 0;
    let targetRotZ = 0;
    let targetYOffset = 0.02;
    let targetScaleY = 1.0;
    let targetScaleXZ = 1.0;

    const dx = pB[0] - pA[0];
    const dz = pB[2] - pA[2];
    const walkAngle = Math.atan2(dx, dz);

    if (timeInCycle < IDLE_DUR) {
      // 1. Organic Idle & Foraging Micro-behaviors
      const idleProg = timeInCycle;
      if (idleProg < 2.5) {
        // Sub-phase A: Sniffing grass & foraging
        const sniffFast = Math.sin(t * 15.0);
        targetRotX = 0.28 + sniffFast * 0.04;
        targetYOffset = 0.01 + Math.abs(sniffFast) * 0.006;
        targetScaleY = 0.96;
        targetScaleXZ = 1.02;
      } else if (idleProg < 4.2) {
        // Sub-phase B: Alert curious scan (sitting upright, looking around)
        const scan = Math.sin((idleProg - 2.5) * 1.8);
        targetRotX = -0.12;
        targetRotY = walkAngle + scan * 0.42;
        targetRotZ = scan * 0.08;
        targetYOffset = 0.028 + Math.sin(t * 3.0) * 0.006;
        targetScaleY = 1.05;
        targetScaleXZ = 0.97;
      } else {
        // Sub-phase C: Calm settling & weight balance
        targetRotX = 0.02;
        targetRotY = walkAngle;
        targetYOffset = 0.02 + Math.sin(t * 2.5) * 0.004;
      }
    } else if (timeInCycle < IDLE_DUR + STEER_DUR) {
      // 2. Pre-Turn & Anticipatory Steering (turns smoothly to face target tile before leaping)
      const steerProg = (timeInCycle - IDLE_DUR) / STEER_DUR;
      const smoothSteer = steerProg * steerProg * (3 - 2 * steerProg);
      targetRotY = walkAngle;
      targetRotZ = (1 - smoothSteer) * -0.08;
      // Crouch anticipation
      targetScaleY = 0.86;
      targetScaleXZ = 1.08;
      targetYOffset = 0.008;
      targetRotX = 0.08;
    } else {
      // 3. Realistic 3-Hop Trajectory (displacement synced strictly to flight arcs)
      const hopProg = (timeInCycle - IDLE_DUR - STEER_DUR) / HOP_DUR;
      const totalHops = 3.0;
      const hopIndex = Math.floor(hopProg * totalHops);
      const localProg = (hopProg * totalHops) % 1.0;

      // Displacement advances primarily during air phase (0.15 to 0.85 of each sub-hop)
      let subDisplacement = 0;
      if (localProg < 0.15) {
        // Takeoff push: still anchored
        subDisplacement = 0;
      } else if (localProg > 0.85) {
        // Landing cushion: fully reached hop segment
        subDisplacement = 1.0;
      } else {
        // Air flight smooth glide
        const airT = (localProg - 0.15) / 0.70;
        subDisplacement = airT * airT * (3 - 2 * airT);
      }

      const totalHopFraction = (hopIndex + subDisplacement) / totalHops;
      targetX = pA[0] + dx * Math.min(1, Math.max(0, totalHopFraction));
      targetZ = pA[2] + dz * Math.min(1, Math.max(0, totalHopFraction));
      targetRotY = walkAngle;

      // Parabolic jump arc with squash & stretch dynamics
      const hopArc = Math.sin(localProg * Math.PI);
      targetYOffset = 0.015 + hopArc * 0.20;

      if (localProg < 0.22) {
        // Liftoff stretch
        targetScaleY = 1.18;
        targetScaleXZ = 0.92;
        targetRotX = -0.18;
      } else if (localProg < 0.78) {
        // Mid-air streamlined glide
        targetScaleY = 1.02;
        targetScaleXZ = 0.98;
        targetRotX = 0.02;
      } else {
        // Touchdown cushion squash
        targetScaleY = 0.84;
        targetScaleXZ = 1.10;
        targetRotX = 0.14;
      }
    }

    // Mutual ground animal collision avoidance
    const MIN_DIST = 0.72;
    let avoidX = 0;
    let avoidZ = 0;
    groundPositionsRef.current.forEach((otherPos, otherId) => {
      if (otherId === id) return;
      const ddx = targetX - otherPos.x;
      const ddz = targetZ - otherPos.z;
      const dist = Math.hypot(ddx, ddz);
      if (dist < MIN_DIST && dist > 0.001) {
        const push = (MIN_DIST - dist) * 0.75;
        const candX = targetX + (ddx / dist) * push;
        const candZ = targetZ + (ddz / dist) * push;
        if (!isRiverZone(candX, candZ, 0.40)) {
          avoidX += (ddx / dist) * push;
          avoidZ += (ddz / dist) * push;
        }
      }
    });

    const finalTargetX = targetX + avoidX;
    const finalTargetZ = targetZ + avoidZ;

    // Smooth movement damping
    const posDamp = Math.min(1, dt * 5.8);
    currentPos.current.x += (finalTargetX - currentPos.current.x) * posDamp;
    currentPos.current.z += (finalTargetZ - currentPos.current.z) * posDamp;

    const yDamp = Math.min(1, dt * 7.5);
    currentYOffset.current += (targetYOffset - currentYOffset.current) * yDamp;

    const scaleDamp = Math.min(1, dt * 8.0);
    currentScaleY.current += (targetScaleY - currentScaleY.current) * scaleDamp;
    currentScaleXZ.current += (targetScaleXZ - currentScaleXZ.current) * scaleDamp;

    // Shortest-arc smooth angular damping
    let angleDiff = targetRotY - currentRotY.current;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    currentRotY.current += angleDiff * Math.min(1, dt * 4.8);

    currentRotX.current += (targetRotX - currentRotX.current) * Math.min(1, dt * 6.5);
    currentRotZ.current += (targetRotZ - currentRotZ.current) * Math.min(1, dt * 6.0);

    const groundH = getTerrainElevation(currentPos.current.x, currentPos.current.z).height;
    groupRef.current.position.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);
    groupRef.current.rotation.set(currentRotX.current, currentRotY.current, currentRotZ.current);
    groupRef.current.scale.set(
      scale * currentScaleXZ.current,
      scale * currentScaleY.current,
      scale * currentScaleXZ.current
    );

    // Register real-time position
    let pos = groundPositionsRef.current.get(id);
    if (!pos) {
      pos = new THREE.Vector3();
      groundPositionsRef.current.set(id, pos);
    }
    pos.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);

    // Ear wiggles during idle & wind resistance during hop
    if (leftEarRef.current && rightEarRef.current) {
      const earWiggle = Math.sin(t * 8.5) * 0.10;
      const hopTilt = currentRotX.current * 0.4;
      leftEarRef.current.rotation.z = -0.15 + earWiggle;
      leftEarRef.current.rotation.x = hopTilt;
      rightEarRef.current.rotation.z = 0.15 - earWiggle;
      rightEarRef.current.rotation.x = hopTilt;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={scale}
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
        <meshStandardMaterial color={furColor} roughness={0.7} />
      </mesh>

      {/* Head */}
      <group position={[0, 0.26, 0.1]}>
        <mesh castShadow>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color={furColor} roughness={0.7} />
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
          <meshStandardMaterial color={furColor} roughness={0.7} />
        </mesh>
        <mesh ref={rightEarRef} position={[0.05, 0.16, 0]} rotation={[0, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.22, 6]} />
          <meshStandardMaterial color={furColor} roughness={0.7} />
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
  id?: string;
  scale?: number;
  phaseOffset?: number;
  roamingTiles: [number, number, number][];
  groundPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isRiverZone: (wx: number, wz: number, radius?: number) => boolean;
  isNight?: boolean;
  onSelect: () => void;
}

function ForestFox({
  id = 'fox',
  scale = 0.28,
  phaseOffset = 0,
  roamingTiles,
  groundPositionsRef,
  isRiverZone,
  isNight = false,
  onSelect,
}: ForestFoxProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_fox.glb');

  // Load custom vibrant red fox texture (eliminates blue Kenney default)
  const foxTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_fox.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && foxTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = foxTexture;
          mat.roughness = 0.82;
          mat.metalness = 0.04;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, foxTexture]);

  const anchor = roamingTiles[0] || [0, 0, 0];
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(anchor[0], anchor[1], anchor[2]));
  const currentRotY = useRef<number>(phaseOffset);
  const currentRotX = useRef<number>(0);
  const currentRotZ = useRef<number>(0);
  const currentYOffset = useRef<number>(0.02);

  const IDLE_DUR = 5.2;
  const STEER_DUR = 0.8;
  const WALK_DUR = 3.2;
  const CYCLE_DUR = IDLE_DUR + STEER_DUR + WALK_DUR;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || roamingTiles.length === 0) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime() + phaseOffset;

    const count = roamingTiles.length;
    const currentIdx = Math.floor(t / CYCLE_DUR) % count;
    const nextIdx = (currentIdx + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = roamingTiles[currentIdx];
    const pB = roamingTiles[nextIdx];

    let targetX = pA[0];
    let targetZ = pA[2];
    let targetRotY = currentRotY.current;
    let targetRotX = 0;
    let targetRotZ = 0;
    let targetYOffset = 0.02;

    const dx = pB[0] - pA[0];
    const dz = pB[2] - pA[2];
    const walkAngle = Math.atan2(dx, dz);

    if (timeInCycle < IDLE_DUR) {
      // 1. Alert Fox Idle: Inquisitive head tilts, ground sniffing, vigilant glances
      const idleProg = timeInCycle;
      if (idleProg < 2.2) {
        // Sub-phase A: Inquisitive sniffing & head tilt
        targetRotX = 0.22 + Math.sin(t * 8.0) * 0.035;
        targetRotZ = Math.sin(idleProg * 2.5) * 0.14;
        targetRotY = walkAngle + Math.sin(idleProg * 1.2) * 0.18;
        targetYOffset = 0.012 + Math.abs(Math.sin(t * 8.0)) * 0.005;
      } else if (idleProg < 4.2) {
        // Sub-phase B: Looking up, scanning patrol route
        const look = Math.sin((idleProg - 2.2) * 1.5);
        targetRotX = -0.06 + Math.sin(t * 2.0) * 0.02;
        targetRotY = walkAngle + look * 0.40;
        targetRotZ = -look * 0.06;
        targetYOffset = 0.024 + Math.sin(t * 2.5) * 0.006;
      } else {
        // Sub-phase C: Stance settling before moving
        targetRotX = 0.02;
        targetRotY = walkAngle;
        targetRotZ = 0;
        targetYOffset = 0.02;
      }
    } else if (timeInCycle < IDLE_DUR + STEER_DUR) {
      // 2. Pre-Steer: Smooth curved torso orientation into walk direction before stepping
      const steerProg = (timeInCycle - IDLE_DUR) / STEER_DUR;
      const smoothSteer = steerProg * steerProg * (3 - 2 * steerProg);
      targetRotY = walkAngle;
      targetRotZ = (1 - smoothSteer) * -0.07;
      targetRotX = 0.04;
      targetYOffset = 0.016;
    } else {
      // 3. Agile Trotting Gait: Synchronized stride frequency, zero moonwalking
      const walkProg = (timeInCycle - IDLE_DUR - STEER_DUR) / WALK_DUR;
      const smooth = walkProg * walkProg * (3 - 2 * walkProg);
      targetX = pA[0] + dx * smooth;
      targetZ = pA[2] + dz * smooth;
      targetRotY = walkAngle;

      const trotCycle = walkProg * Math.PI * 8.0;
      const trotBob = Math.abs(Math.sin(trotCycle)) * 0.042;
      targetYOffset = 0.02 + trotBob;
      targetRotX = Math.sin(trotCycle) * 0.032;
      targetRotZ = Math.sin(trotCycle * 0.5) * 0.040;
    }

    // Mutual ground animal collision avoidance
    const MIN_DIST = 0.78;
    let avoidX = 0;
    let avoidZ = 0;
    groundPositionsRef.current.forEach((otherPos, otherId) => {
      if (otherId === id) return;
      const ddx = targetX - otherPos.x;
      const ddz = targetZ - otherPos.z;
      const dist = Math.hypot(ddx, ddz);
      if (dist < MIN_DIST && dist > 0.001) {
        const push = (MIN_DIST - dist) * 0.75;
        const candX = targetX + (ddx / dist) * push;
        const candZ = targetZ + (ddz / dist) * push;
        if (!isRiverZone(candX, candZ, 0.40)) {
          avoidX += (ddx / dist) * push;
          avoidZ += (ddz / dist) * push;
        }
      }
    });

    const finalTargetX = targetX + avoidX;
    const finalTargetZ = targetZ + avoidZ;

    // Movement and rotation damping
    const posDamp = Math.min(1, dt * 5.2);
    currentPos.current.x += (finalTargetX - currentPos.current.x) * posDamp;
    currentPos.current.z += (finalTargetZ - currentPos.current.z) * posDamp;

    const yDamp = Math.min(1, dt * 7.0);
    currentYOffset.current += (targetYOffset - currentYOffset.current) * yDamp;

    let angleDiff = targetRotY - currentRotY.current;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    currentRotY.current += angleDiff * Math.min(1, dt * 4.6);

    currentRotX.current += (targetRotX - currentRotX.current) * Math.min(1, dt * 5.5);
    currentRotZ.current += (targetRotZ - currentRotZ.current) * Math.min(1, dt * 5.5);

    const groundH = getTerrainElevation(currentPos.current.x, currentPos.current.z).height;
    groupRef.current.position.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);
    groupRef.current.rotation.set(currentRotX.current, currentRotY.current, currentRotZ.current);

    // Register real-time position
    let pos = groundPositionsRef.current.get(id);
    if (!pos) {
      pos = new THREE.Vector3();
      groundPositionsRef.current.set(id, pos);
    }
    pos.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);
  });

  return (
    <group
      ref={groupRef}
      scale={scale}
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
// 5. TREE KOALA (Kenney Cube Pets animal-koala.glb - Expressive leaf-nibbling buddy)
// ============================================================================
interface TreeKoalaProps {
  basePos: [number, number, number];
  groundPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isNight?: boolean;
  onSelect: () => void;
}

function TreeKoala({ basePos, groundPositionsRef, isNight = false, onSelect }: TreeKoalaProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leafRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/fauna_koala.glb');

  const koalaTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_cubepets.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && koalaTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = koalaTexture;
          mat.roughness = 0.84;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, koalaTexture]);

  // Expressive 4-phase lifecycle (16s cycle):
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    const cycle = t % 11.0;

    let yOff = 0;
    let rotX = 0;
    let rotY = 1.1; // Base cozy angle
    let rotZ = 0;
    let leafScale = 1.0;

    if (cycle < 3.5) {
      // Phase 1: Hungry leaf chomping (energetic bobs & rhythmic nibble)
      const munch = Math.sin(t * 8.5);
      rotX = 0.22 + munch * 0.12;
      rotZ = Math.sin(t * 4.0) * 0.08;
      yOff = Math.abs(munch) * 0.024;
      leafScale = 1.0 + munch * 0.14;
    } else if (cycle < 6.5) {
      // Phase 2: Curious forest scan & inquisitive tilts
      const p2 = cycle - 3.5;
      rotY = 1.1 + Math.sin(p2 * 2.2) * 0.55;
      rotZ = Math.sin(p2 * 4.2) * 0.16;
      yOff = Math.abs(Math.sin(p2 * 3.0)) * 0.02;
      rotX = 0.05 + Math.sin(p2 * 2.0) * 0.1;
    } else if (cycle < 8.8) {
      // Phase 3: Happy paw wave & body wiggle shake
      const p3 = cycle - 6.5;
      const wiggle = Math.sin(p3 * 18.0);
      rotZ = wiggle * 0.20;
      rotX = 0.12 + Math.abs(wiggle) * 0.08;
      yOff = Math.abs(wiggle) * 0.028;
    } else {
      // Phase 4: Big satisfying stretch & proud puff
      const p4 = (cycle - 8.8) / 2.2;
      const stretch = Math.sin(p4 * Math.PI);
      rotX = -stretch * 0.26;
      yOff = stretch * 0.045;
      rotY = 1.1 + Math.sin(t * 1.5) * 0.12;
    }

    groupRef.current.position.set(basePos[0], basePos[1] + 0.02 + yOff, basePos[2]);
    groupRef.current.rotation.set(rotX, rotY, rotZ);

    if (leafRef.current) {
      leafRef.current.scale.setScalar(leafScale);
      leafRef.current.rotation.z = Math.sin(t * 7.5) * 0.15;
    }

    // Register stationary anchor position
    let pos = groundPositionsRef.current.get('koala');
    if (!pos) {
      pos = new THREE.Vector3();
      groundPositionsRef.current.set('koala', pos);
    }
    pos.set(basePos[0], basePos[1] + 0.02, basePos[2]);
  });

  return (
    <group
      ref={groupRef}
      position={[basePos[0], basePos[1] + 0.02, basePos[2]]}
      rotation={[0, 1.1, 0]}
      scale={0.26}
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

      {/* Fresh Eucalyptus Leaf Prop held in cute paws */}
      <group ref={leafRef} position={[0.02, 0.14, 0.16]} rotation={[0.4, 0.2, -0.3]}>
        <mesh castShadow>
          <coneGeometry args={[0.045, 0.13, 5]} />
          <meshStandardMaterial color="#10B981" roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.06, 4]} />
          <meshStandardMaterial color="#047857" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 6. CUBE PET GROUND WALKER (Kenney Cube Pets: Deer, Elephant, Tiger, Polar, Panda, Lion, Hog, Giraffe, Cat, Beaver)
// ============================================================================
interface CubePetGroundWalkerProps {
  id: string;
  species: FaunaSpecies;
  modelPath: string;
  scale?: number;
  phaseOffset?: number;
  idleDuration?: number;
  walkDuration?: number;
  roamingTiles: [number, number, number][];
  groundPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isRiverZone: (wx: number, wz: number, radius?: number) => boolean;
  isNight?: boolean;
  onSelect: () => void;
}

function CubePetGroundWalker({
  id,
  modelPath,
  scale = 0.38,
  phaseOffset = 0,
  idleDuration = 5.0,
  walkDuration = 3.5,
  roamingTiles,
  groundPositionsRef,
  isNight = false,
  onSelect,
}: CubePetGroundWalkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);

  const petTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_cubepets.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && petTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = petTexture;
          mat.roughness = 0.85; // Natural matte finish, zero specular glare
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, petTexture]);

  const anchorPos = roamingTiles[0] || [0, 0, 0];
  const currentPos = useRef<THREE.Vector3>(
    new THREE.Vector3(anchorPos[0], anchorPos[1], anchorPos[2])
  );
  const currentRotY = useRef<number>(phaseOffset);
  const currentRotX = useRef<number>(0);
  const currentRotZ = useRef<number>(0);
  const currentYOffset = useRef<number>(0.02);

  const STEER_DUR = 0.8;
  const CYCLE_DUR = idleDuration + STEER_DUR + walkDuration;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || roamingTiles.length === 0) return;
    const t = clock.getElapsedTime() + phaseOffset;

    const count = roamingTiles.length;
    const currentIdx = Math.floor(t / CYCLE_DUR) % count;
    const nextIdx = (currentIdx + 1) % count;
    const timeInCycle = t % CYCLE_DUR;

    const pA = roamingTiles[currentIdx];
    const pB = roamingTiles[nextIdx];

    let targetX = pA[0];
    let targetZ = pA[2];
    let targetRotY = currentRotY.current;
    let targetRotX = 0;
    let targetRotZ = 0;
    let targetYOffset = 0.02;

    const dx = pB[0] - pA[0];
    const dz = pB[2] - pA[2];
    const walkAngle = Math.atan2(dx, dz);

    if (timeInCycle < idleDuration) {
      // 1. Idle phase: look around, calm breathing bob
      const idleTime = timeInCycle;
      const breathe = Math.sin(idleTime * 2.2) * 0.009;
      targetYOffset = 0.02 + breathe;
      targetRotX = Math.sin(idleTime * 1.4) * 0.025;
      targetRotY = (pA[0] > 0 ? 0.45 : -0.45) + Math.sin(idleTime * 0.85) * 0.22;
      targetRotZ = Math.sin(idleTime * 1.6) * 0.02;
    } else if (timeInCycle < idleDuration + STEER_DUR) {
      // 2. Pre-Steer: Smooth curved torso orientation into walk direction before stepping
      const steerProg = (timeInCycle - idleDuration) / STEER_DUR;
      const smoothSteer = steerProg * steerProg * (3 - 2 * steerProg);
      targetRotY = walkAngle;
      targetRotZ = (1 - smoothSteer) * -0.06;
      targetRotX = 0.03;
      targetYOffset = 0.016;
    } else {
      // 3. Walk phase: Smoothstep step toward next tile with synchronized stride
      const walkProg = (timeInCycle - idleDuration - STEER_DUR) / walkDuration;
      const smooth = walkProg * walkProg * (3 - 2 * walkProg);
      targetX = pA[0] + dx * smooth;
      targetZ = pA[2] + dz * smooth;
      targetRotY = walkAngle;
      const stepBob = Math.abs(Math.sin(walkProg * Math.PI * 6)) * 0.036;
      targetYOffset = 0.02 + stepBob;
      targetRotX = Math.sin(walkProg * Math.PI * 6) * 0.025;
      targetRotZ = Math.sin(walkProg * Math.PI * 3) * 0.030;
    }

    // Mutual collision avoidance: Gently steer away from other ground animals
    const MIN_DIST = 0.95;
    let avoidX = 0;
    let avoidZ = 0;
    groundPositionsRef.current.forEach((otherPos, otherId) => {
      if (otherId === id) return;
      const distDx = targetX - otherPos.x;
      const distDz = targetZ - otherPos.z;
      const dist = Math.hypot(distDx, distDz);
      if (dist < MIN_DIST && dist > 0.001) {
        const push = (MIN_DIST - dist) * 0.55;
        avoidX += (distDx / dist) * push;
        avoidZ += (distDz / dist) * push;
      }
    });

    const finalTargetX = targetX + avoidX;
    const finalTargetZ = targetZ + avoidZ;

    const dt = Math.min(delta, 0.1);
    const posDamp = Math.min(1, dt * 4.2);
    currentPos.current.x += (finalTargetX - currentPos.current.x) * posDamp;
    currentPos.current.z += (finalTargetZ - currentPos.current.z) * posDamp;

    const yDamp = Math.min(1, dt * 5.5);
    currentYOffset.current += (targetYOffset - currentYOffset.current) * yDamp;

    let angleDiff = targetRotY - currentRotY.current;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    currentRotY.current += angleDiff * Math.min(1, dt * 3.8);

    currentRotX.current += (targetRotX - currentRotX.current) * Math.min(1, dt * 4.5);
    currentRotZ.current += (targetRotZ - currentRotZ.current) * Math.min(1, dt * 4.5);

    const groundH = getTerrainElevation(currentPos.current.x, currentPos.current.z).height;
    groupRef.current.position.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);
    groupRef.current.rotation.set(currentRotX.current, currentRotY.current, currentRotZ.current);
    groupRef.current.scale.set(scale, scale, scale);

    let pos = groundPositionsRef.current.get(id);
    if (!pos) {
      pos = new THREE.Vector3();
      groundPositionsRef.current.set(id, pos);
    }
    pos.set(currentPos.current.x, groundH + currentYOffset.current, currentPos.current.z);
  });

  if (!roamingTiles || roamingTiles.length === 0) return null;

  return (
    <group
      ref={groupRef}
      scale={scale}
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
// 7. RIVER FISH (Kenney Cube Pets: animal-fish.glb - Swimming inside stream)
// ============================================================================
interface RiverFishProps {
  id: string;
  riverWaypoints: [number, number, number][];
  scale?: number;
  phaseOffset?: number;
  isNight?: boolean;
  onSelect: () => void;
}

function RiverFish({
  riverWaypoints,
  scale = 0.32,
  phaseOffset = 0,
  isNight = false,
  onSelect,
}: RiverFishProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/animal-fish.glb');

  const fishTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_cubepets.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && fishTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = fishTexture;
          mat.roughness = 0.8;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, fishTexture]);

  const currentRotY = useRef<number>(phaseOffset);
  const currentPos = useRef<THREE.Vector3>(
    new THREE.Vector3(
      riverWaypoints[0] ? riverWaypoints[0][0] : 0,
      -0.14,
      riverWaypoints[0] ? riverWaypoints[0][2] : 0
    )
  );

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || riverWaypoints.length === 0) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime() + phaseOffset;

    let targetX = 0;
    let targetZ = 0;
    let targetRotY = currentRotY.current;

    if (riverWaypoints.length === 1) {
      // Single tile pool: serene circular patrol inside the tile boundaries
      const center = riverWaypoints[0];
      const radius = 0.22;
      const angle = t * 1.35;
      targetX = center[0] + Math.cos(angle) * radius;
      targetZ = center[2] + Math.sin(angle) * radius;
      targetRotY = angle + Math.PI / 2; // Swim tangent to the circle
    } else {
      // Continuous connected patrol path (each segment is strictly adjacent)
      const count = riverWaypoints.length;
      const TILE_SWIM_DUR = 2.4; // 2.4 seconds per tile for gentle, natural gliding
      const totalCycle = count * TILE_SWIM_DUR;
      const timeInCycle = t % totalCycle;

      const currentIdx = Math.floor(timeInCycle / TILE_SWIM_DUR) % count;
      const nextIdx = (currentIdx + 1) % count;
      const progress = (timeInCycle % TILE_SWIM_DUR) / TILE_SWIM_DUR;

      const pA = riverWaypoints[currentIdx];
      const pB = riverWaypoints[nextIdx];

      const dx = pB[0] - pA[0];
      const dz = pB[2] - pA[2];
      targetRotY = Math.atan2(dx, dz);

      // Smoothstep easing for swimming between adjacent water tiles
      const smooth = progress * progress * (3 - 2 * progress);
      targetX = pA[0] + dx * smooth;
      targetZ = pA[2] + dz * smooth;
    }

    // Smooth shortest-arc angular damping for turns and dead-end reversals
    let angleDiff = targetRotY - currentRotY.current;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    currentRotY.current += angleDiff * Math.min(1, dt * 4.8);

    // Natural fin and tail swimming physics
    const tailWiggle = Math.sin(t * 8.5) * 0.22;
    const bodyRoll = (angleDiff * 0.35) + Math.sin(t * 4.2) * 0.08;
    const swimBob = Math.sin(t * 3.6) * 0.02;

    currentPos.current.x += (targetX - currentPos.current.x) * Math.min(1, dt * 6.0);
    currentPos.current.z += (targetZ - currentPos.current.z) * Math.min(1, dt * 6.0);

    groupRef.current.position.set(currentPos.current.x, -0.14 + swimBob, currentPos.current.z);
    groupRef.current.rotation.set(0, currentRotY.current + tailWiggle, bodyRoll);
    groupRef.current.scale.set(scale, scale, scale);
  });

  if (!riverWaypoints || riverWaypoints.length === 0) return null;

  return (
    <group
      ref={groupRef}
      scale={scale}
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
// 8. TREE MONKEY (Kenney Cube Pets: animal-monkey.glb - Perched in tree canopies)
// ============================================================================
interface TreeMonkeyProps {
  branchWaypoints: [number, number, number][];
  scale?: number;
  phaseOffset?: number;
  groundPositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isNight?: boolean;
  onSelect: () => void;
}

function TreeMonkey({
  branchWaypoints,
  scale = 0.22,
  phaseOffset = 0,
  groundPositionsRef,
  isNight = false,
  onSelect,
}: TreeMonkeyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/animal-monkey.glb');

  const monkeyTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/models/Textures/colormap_cubepets.png', () => {
      tex.needsUpdate = true;
    });
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const mesh = node as THREE.Mesh;
        if (mesh.material && monkeyTexture) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = monkeyTexture;
          mat.roughness = 0.85;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return cloned;
  }, [scene, monkeyTexture]);

  useFrame(({ clock }) => {
    if (!groupRef.current || branchWaypoints.length === 0) return;
    const t = clock.getElapsedTime() + phaseOffset;

    const count = branchWaypoints.length;
    const HOP_CYCLE = 6.0;
    const curIdx = Math.floor(t / HOP_CYCLE) % count;
    const p = branchWaypoints[curIdx];

    const cycle = t % HOP_CYCLE;
    let yOff = 0;
    let rotY = 0.8 + Math.sin(t * 1.5) * 0.35;
    let rotX = 0.08 + Math.sin(t * 2.5) * 0.1;
    let rotZ = Math.sin(t * 3.0) * 0.08;

    if (cycle < 1.0) {
      // Playful head scratch / curious tilt
      rotZ = Math.sin(t * 8.0) * 0.18;
    } else if (cycle > 4.5 && count > 1) {
      // Gentle nimble hop around tree base/lower trunk
      const hopProg = (cycle - 4.5) / 1.5;
      yOff = Math.sin(hopProg * Math.PI) * 0.05;
      rotX += Math.sin(hopProg * Math.PI) * 0.12;
    }

    groupRef.current.position.set(p[0], p[1] + yOff, p[2]);
    groupRef.current.rotation.set(rotX, rotY, rotZ);
    groupRef.current.scale.set(scale, scale, scale);
    let pos = groundPositionsRef.current.get('monkey');
    if (!pos) {
      pos = new THREE.Vector3();
      groundPositionsRef.current.set('monkey', pos);
    }
    pos.set(p[0], p[1], p[2]);
  });

  if (!branchWaypoints || branchWaypoints.length === 0) return null;

  return (
    <group
      ref={groupRef}
      scale={scale}
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
// MAIN FAUNA ECOSYSTEM ROOT COMPONENT
// ============================================================================
export function FaunaEcosystem() {
  const saveData = useGameStore((state) => state.saveData);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const activeBiome = useGameStore((state) => state.activeBiome);
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

  // Eligibility checks for all 17 species
  const canBee = checkFaunaEligibility('bee', saveData, timeOfDay, undefined, activeBiome);
  const canBird = checkFaunaEligibility('bird', saveData, timeOfDay, undefined, activeBiome);
  const canRabbit = checkFaunaEligibility('rabbit', saveData, timeOfDay, undefined, activeBiome);
  const canFox = checkFaunaEligibility('fox', saveData, timeOfDay, undefined, activeBiome);
  const canKoala = checkFaunaEligibility('koala', saveData, timeOfDay, undefined, activeBiome);
  const canDeer =
    checkFaunaEligibility('deer', saveData, timeOfDay, undefined, activeBiome) ||
    checkFaunaEligibility('mystic_stag', saveData, timeOfDay, undefined, activeBiome);
  const canElephant = checkFaunaEligibility('elephant', saveData, timeOfDay, undefined, activeBiome);
  const canTiger = checkFaunaEligibility('tiger', saveData, timeOfDay, undefined, activeBiome);
  const canPolar = checkFaunaEligibility('polar', saveData, timeOfDay, undefined, activeBiome);
  const canPanda = checkFaunaEligibility('panda', saveData, timeOfDay, undefined, activeBiome);
  const canMonkey = checkFaunaEligibility('monkey', saveData, timeOfDay, undefined, activeBiome);
  const canLion = checkFaunaEligibility('lion', saveData, timeOfDay, undefined, activeBiome);
  const canHog = checkFaunaEligibility('hog', saveData, timeOfDay, undefined, activeBiome);
  const canGiraffe = checkFaunaEligibility('giraffe', saveData, timeOfDay, undefined, activeBiome);
  const canFish = checkFaunaEligibility('fish', saveData, timeOfDay, undefined, activeBiome);
  const canCat = checkFaunaEligibility('cat', saveData, timeOfDay, undefined, activeBiome);
  const canBeaver = checkFaunaEligibility('beaver', saveData, timeOfDay, undefined, activeBiome);

  const worldObjects = saveData.world_objects || [];
  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(saveData.world, worldObjects),
    [saveData.world, worldObjects]
  );

  // River network mapping
  const riverTileMap = useMemo(() => {
    return buildRiverTileMap(worldObjects, unlockedSet);
  }, [worldObjects, unlockedSet]);

  // Checks whether a world coordinate (wx, wz) falls in or near any active river channel
  const isRiverZone = useMemo(() => {
    return (wx: number, wz: number, radius = 0.44): boolean => {
      if (riverTileMap.size === 0) return false;
      const tileSize = GAME_CONFIG.grid.tileSize;
      const offset = GAME_CONFIG.grid.offset;
      const rawGx = wx / tileSize - offset;
      const rawGy = wz / tileSize - offset;
      const gx = Math.round(rawGx);
      const gy = Math.round(rawGy);
      const key = `${gx},${gy}`;
      const adj = riverTileMap.get(key);
      if (!adj) return false;
      const cx = (gx + offset) * tileSize;
      const cz = (gy + offset) * tileSize;
      const dx = wx - cx;
      const dz = wz - cz;
      const dStream = getRiverChannelDistance(dx, dz, adj);
      return dStream < radius;
    };
  }, [riverTileMap]);

  // Checks whether a straight path between two positions crosses through river water
  const pathCrossesRiver = useMemo(() => {
    return (pA: [number, number, number], pB: [number, number, number]): boolean => {
      if (riverTileMap.size === 0) return false;
      const STEPS = 8;
      for (let i = 0; i <= STEPS; i++) {
        const frac = i / STEPS;
        const x = pA[0] + (pB[0] - pA[0]) * frac;
        const z = pA[2] + (pB[2] - pA[2]) * frac;
        if (isRiverZone(x, z, 0.42)) return true;
      }
      return false;
    };
  }, [riverTileMap, isRiverZone]);

  // --------------------------------------------------------------------------
  // SPATIAL DISPERSION ALGORITHM: Disperse animals across distinct dry quadrants
  // --------------------------------------------------------------------------
  const { unoccupiedTiles, activeTrees, flowers, tentObject } = useMemo<{
    unoccupiedTiles: [number, number, [number, number, number]][];
    activeTrees: WorldObject[];
    flowers: WorldObject[];
    tentObject: WorldObject | null;
  }>(() => {
    const empty: [number, number, [number, number, number]][] = [];
    const trees: WorldObject[] = [];
    const flws: WorldObject[] = [];
    let tent: WorldObject | null = null;

    for (const obj of worldObjects) {
      if (obj.object_type === 'tree' && obj.status === 'active') {
        trees.push(obj);
      } else if (isFlowerOrBush(obj)) {
        flws.push(obj);
      } else if (
        (obj.model_variant || '').toLowerCase().includes('tent') ||
        (obj.id || '').toLowerCase().includes('tent')
      ) {
        tent = obj;
      }
    }

    for (const key of Array.from(unlockedSet)) {
      const [gx, gy] = key.split(',').map(Number);
      // Strictly exclude any tile occupied by an object OR part of river water network
      if (!isTileOccupied(gx, gy, worldObjects) && !riverTileMap.has(key)) {
        const wPos = gridToWorld(gx, gy);
        if (!isRiverZone(wPos[0], wPos[2], 0.44)) {
          empty.push([gx, gy, wPos]);
        }
      }
    }

    return { unoccupiedTiles: empty, activeTrees: trees, flowers: flws, tentObject: tent };
  }, [unlockedSet, worldObjects, riverTileMap, isRiverZone]);

  // 1. Honey Bee flower targets
  const beeCenters = useMemo<[number, number, number][]>(() => {
    if (flowers.length > 0) {
      return flowers.map((f) => gridToWorld(f.grid_x, f.grid_y));
    }
    // Fallback: 2 distinct grassy lawn points
    return [gridToWorld(4, 4), gridToWorld(5, 4)];
  }, [flowers]);

  // 2. Songbird Waypoints (Tree branches at y = 0.72 - 0.85 + ground pecking spots)
  const birdWaypoints = useMemo<[number, number, number][]>(() => {
    const points: [number, number, number][] = [];

    // Tree branch perches
    activeTrees.forEach((t) => {
      const w = gridToWorld(t.grid_x, t.grid_y);
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
      return [
        [0, 0.72, 0],
        [1.2, 0.18, 0],
        [-1.2, 0.72, 1.2],
      ];
    }
    if (points.length === 1) {
      const p = points[0];
      return [p, [p[0] + 1.2, 0.2, p[2] + 0.8], [p[0] - 0.8, 0.65, p[2] - 0.8]];
    }
    return points;
  }, [activeTrees, unoccupiedTiles]);

  // 3. Connected River Patrol Networks (Prevents fish from leaping across land or between separate streams)
  const riverPatrolNetworks = useMemo<[number, number, number][][]>(() => {
    const paths = getConnectedRiverPatrolPaths(riverTileMap);
    if (paths.length === 0) return [];

    return paths.map((gridPath) =>
      gridPath.map(([gx, _, gy]) => {
        const w = gridToWorld(gx, gy);
        return [w[0], -0.14, w[2]] as [number, number, number];
      })
    );
  }, [riverTileMap]);

  // 4. Tree Monkey Branch Waypoints (Sitting & perching on lower tree trunk / mossy base, below foliage)
  const monkeyBranchWaypoints = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    activeTrees.forEach((t) => {
      const w = gridToWorld(t.grid_x, t.grid_y);
      // Positioned on the lower trunk / roots facing outward (below canopy height)
      pts.push([w[0] + 0.24, w[1] + 0.12, w[2] + 0.22]);
      pts.push([w[0] - 0.24, w[1] + 0.12, w[2] + 0.20]);
    });
    if (pts.length === 0) {
      return [
        [0, 0.12, 0],
        [0.3, 0.12, 0.3],
      ];
    }
    return pts;
  }, [activeTrees]);

  // Shared registry of ground fauna positions for mutual collision avoidance
  const groundPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  // --------------------------------------------------------------------------
  // EXCLUSIVE FAUNA TERRITORIAL PARTITIONING
  // Guarantees zero overlap: Each ground species receives isolated, non-overlapping waypoints
  // --------------------------------------------------------------------------
  const {
    bunnyRoamingTiles,
    foxRoamingTiles,
    koalaGroundPos,
    deerRoamingTiles,
    elephantRoamingTiles,
    tigerRoamingTiles,
    polarRoamingTiles,
    pandaRoamingTiles,
    lionRoamingTiles,
    hogRoamingTiles,
    giraffeRoamingTiles,
    catRoamingTiles,
    beaverRoamingTiles,
  } = useMemo(() => {
    // 1. Identify tree anchor for Koala first
    let koalaPos: [number, number, number] = [0, 0, 0];
    const usedTileKeys = new Set<string>();

    if (activeTrees.length > 0) {
      const target =
        activeTrees.find(
          (t) =>
            t.species === 'ancient' ||
            t.species === 'oak' ||
            (t.model_variant || '').includes('oak')
        ) || activeTrees[0];
      const w = gridToWorld(target.grid_x, target.grid_y);
      const cand1: [number, number, number] = [w[0] + 0.32, w[1], w[2] + 0.3];
      if (!isRiverZone(cand1[0], cand1[2], 0.35)) {
        koalaPos = cand1;
      } else {
        koalaPos = [w[0] - 0.32, w[1], w[2] - 0.3];
      }
      usedTileKeys.add(`${target.grid_x},${target.grid_y}`);
    } else if (unoccupiedTiles.length > 0) {
      koalaPos = unoccupiedTiles[0][2];
      usedTileKeys.add(`${unoccupiedTiles[0][0]},${unoccupiedTiles[0][1]}`);
    } else {
      koalaPos = gridToWorld(4, 4);
    }

    const isFarFromKoala = (pos: [number, number, number]) => {
      return Math.hypot(pos[0] - koalaPos[0], pos[2] - koalaPos[2]) >= 0.85;
    };

    // Filter available dry tiles
    const availablePool = unoccupiedTiles.filter(([gx, gy, pos]) => {
      const key = `${gx},${gy}`;
      return !usedTileKeys.has(key) && isFarFromKoala(pos);
    });

    // Helper: Select up to maxCount non-crossing waypoints from candidates on-island
    const allocateTiles = (
      predicate: (gx: number, gy: number, pos: [number, number, number]) => boolean,
      maxCount = 2
    ): [number, number, number][] => {
      const selected: [number, number, number][] = [];
      const candidates = availablePool.filter(
        ([gx, gy, pos]) => !usedTileKeys.has(`${gx},${gy}`) && predicate(gx, gy, pos)
      );

      for (const [gx, gy, pos] of candidates) {
        if (selected.length === 0 || !pathCrossesRiver(selected[selected.length - 1], pos)) {
          selected.push(pos);
          usedTileKeys.add(`${gx},${gy}`);
          if (selected.length >= maxCount) break;
        }
      }

      // If candidates matching predicate were insufficient, grab from remaining available dry tiles on island
      while (selected.length < maxCount) {
        const remaining = availablePool.find(([gx, gy]) => !usedTileKeys.has(`${gx},${gy}`));
        if (!remaining) break;
        selected.push(remaining[2]);
        usedTileKeys.add(`${remaining[0]},${remaining[1]}`);
      }

      // If STILL empty (no unassigned tiles left), safely share an unoccupied tile from unoccupiedTiles!
      // NEVER create an imaginary coordinate outside the island!
      if (selected.length === 0 && unoccupiedTiles.length > 0) {
        const fallbackTile = unoccupiedTiles[usedTileKeys.size % unoccupiedTiles.length][2];
        selected.push(fallbackTile);
      }

      return selected;
    };

    // Beaver: Prefers tiles near river bank
    const beaverTiles = allocateTiles(
      (gx, gy, pos) => isRiverZone(pos[0], pos[2], 0.95),
      2
    );

    // Cat: Prefers tiles near tent if present, otherwise near center
    const tentPos = tentObject ? gridToWorld(tentObject.grid_x, tentObject.grid_y) : gridToWorld(4, 4);
    const catTiles = allocateTiles(
      (gx, gy, pos) => Math.hypot(pos[0] - tentPos[0], pos[2] - tentPos[2]) <= 1.8,
      2
    );

    // Bunny: SW quadrant
    const bTiles = allocateTiles(
      (gx, gy) => gx <= 4 && gy <= 4,
      3
    );

    // Fox: NE quadrant
    const fTiles = allocateTiles(
      (gx, gy) => gx >= 5 || gy >= 5,
      2
    );

    // Deer: Perimeter spacious corners
    const deerTiles = allocateTiles(
      (gx, gy) => (gx >= 5 && gy <= 3) || (gx <= 3 && gy >= 5) || (gx >= 6 && gy >= 6),
      3
    );

    // Elephant: Open central meadow
    const elephantTiles = allocateTiles(
      (gx, gy) => gx >= 3 && gx <= 6,
      2
    );

    // Tiger: Dense boundary / bushes
    const tigerTiles = allocateTiles(
      (gx, gy) => gx <= 3,
      2
    );

    // Polar: Northern sector
    const polarTiles = allocateTiles(
      (gx, gy) => gy <= 3,
      2
    );

    // Panda: Near trees / Western sector
    const pandaTiles = allocateTiles(
      (gx, gy) => gx <= 4 && gy >= 4,
      2
    );

    // Lion: Southern spacious plateau
    const lionTiles = allocateTiles(
      (gx, gy) => gy >= 5,
      2
    );

    // Hog: Rocky edge
    const hogTiles = allocateTiles(
      (gx, gy) => gx >= 5,
      2
    );

    // Giraffe: Northern / open ridge (STRICTLY ON-ISLAND)
    const giraffeTiles = allocateTiles(
      (gx, gy) => gy <= 4,
      2
    );

    return {
      bunnyRoamingTiles: bTiles,
      foxRoamingTiles: fTiles,
      koalaGroundPos: koalaPos,
      deerRoamingTiles: deerTiles,
      elephantRoamingTiles: elephantTiles,
      tigerRoamingTiles: tigerTiles,
      polarRoamingTiles: polarTiles,
      pandaRoamingTiles: pandaTiles,
      lionRoamingTiles: lionTiles,
      hogRoamingTiles: hogTiles,
      giraffeRoamingTiles: giraffeTiles,
      catRoamingTiles: catTiles,
      beaverRoamingTiles: beaverTiles,
    };
  }, [unoccupiedTiles, activeTrees, tentObject, isRiverZone, pathCrossesRiver]);

  return (
    <group name="fauna-ecosystem">
      {/* 1. Honey Bees (4 agile pollinators flitting at flowers) */}
      {canBee && (
        <group name="fauna-bees">
          <HoneyBee
            centers={beeCenters}
            speed={1.1}
            radius={0.65}
            phaseOffset={0}
            scale={0.13}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
          <HoneyBee
            centers={beeCenters}
            speed={1.3}
            radius={0.5}
            phaseOffset={Math.PI}
            scale={0.12}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
          <HoneyBee
            centers={beeCenters}
            speed={0.95}
            radius={0.75}
            phaseOffset={2.2}
            scale={0.12}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
          <HoneyBee
            centers={beeCenters}
            speed={1.2}
            radius={0.58}
            phaseOffset={4.1}
            scale={0.11}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bee', beeCenters[0])}
          />
        </group>
      )}

      {/* 2. Songbirds (Azure Robin, Golden Canary & Emerald Finch soaring gracefully) */}
      {canBird && (
        <group name="fauna-songbirds">
          <Songbird
            waypoints={birdWaypoints}
            bodyColor="#0284C7"
            breastColor="#FEF3C7"
            wingColor="#0369A1"
            scale={0.32}
            phaseOffset={0}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bird', birdWaypoints[0])}
          />
          <Songbird
            waypoints={birdWaypoints.length > 1 ? [...birdWaypoints].reverse() : birdWaypoints}
            bodyColor="#F59E0B"
            breastColor="#FEF08A"
            wingColor="#D97706"
            scale={0.26}
            phaseOffset={3.8}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bird', birdWaypoints[0])}
          />
          <Songbird
            waypoints={birdWaypoints}
            bodyColor="#059669"
            breastColor="#D1FAE5"
            wingColor="#047857"
            scale={0.24}
            phaseOffset={1.9}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('bird', birdWaypoints[0])}
          />
        </group>
      )}

      {/* 3. Meadow Bunnies (Snow Bunny, Caramel Bunny & Mini Cotton Bunny hopping across meadows) */}
      {canRabbit && (
        <group name="fauna-bunnies">
          <MeadowBunny
            id="rabbit_1"
            furColor="#FAF5FF"
            scale={0.24}
            phaseOffset={0}
            roamingTiles={bunnyRoamingTiles}
            groundPositionsRef={groundPositionsRef}
            isRiverZone={isRiverZone}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('rabbit', bunnyRoamingTiles[0])}
          />
          <MeadowBunny
            id="rabbit_2"
            furColor="#FDE68A"
            scale={0.20}
            phaseOffset={4.5}
            roamingTiles={bunnyRoamingTiles.length > 1 ? [...bunnyRoamingTiles].reverse() : bunnyRoamingTiles}
            groundPositionsRef={groundPositionsRef}
            isRiverZone={isRiverZone}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('rabbit', bunnyRoamingTiles[0])}
          />
          <MeadowBunny
            id="rabbit_3"
            furColor="#E2E8F0"
            scale={0.17}
            phaseOffset={2.4}
            roamingTiles={bunnyRoamingTiles}
            groundPositionsRef={groundPositionsRef}
            isRiverZone={isRiverZone}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('rabbit', bunnyRoamingTiles[0])}
          />
        </group>
      )}

      {/* 4. Forest Foxes (Adult Fox & Playful Kit patrolling perimeter without collisions) */}
      {canFox && (
        <group name="fauna-foxes">
          <ForestFox
            id="fox_1"
            scale={0.22}
            phaseOffset={0}
            roamingTiles={foxRoamingTiles}
            groundPositionsRef={groundPositionsRef}
            isRiverZone={isRiverZone}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('fox', foxRoamingTiles[0])}
          />
          <ForestFox
            id="fox_2"
            scale={0.17}
            phaseOffset={5.0}
            roamingTiles={foxRoamingTiles.length > 1 ? [...foxRoamingTiles].reverse() : foxRoamingTiles}
            groundPositionsRef={groundPositionsRef}
            isRiverZone={isRiverZone}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('fox', foxRoamingTiles[0])}
          />
        </group>
      )}

      {/* 5. Tree Koala (Active eucalyptus nibbler with curious scan & body shakes) */}
      {canKoala && (
        <TreeKoala
          basePos={koalaGroundPos}
          groundPositionsRef={groundPositionsRef}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('koala', koalaGroundPos)}
        />
      )}

      {/* 6. Deer (Kenney Cube Pet Deer - Natural brown coat, calm wanderer, sleeps at night) */}
      {canDeer && (
        <CubePetGroundWalker
          id="deer"
          species="deer"
          modelPath="/models/animal-deer.glb"
          scale={0.32}
          phaseOffset={0.5}
          idleDuration={5.0}
          walkDuration={3.5}
          roamingTiles={deerRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('deer', deerRoamingTiles[0])}
        />
      )}

      {/* 7. Elephant (Raksasa Lembut pelindung padang) */}
      {canElephant && (
        <CubePetGroundWalker
          id="elephant"
          species="elephant"
          modelPath="/models/animal-elephant.glb"
          scale={0.36}
          phaseOffset={1.2}
          idleDuration={6.0}
          walkDuration={4.0}
          roamingTiles={elephantRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('elephant', elephantRoamingTiles[0])}
        />
      )}

      {/* 8. Tiger (Harimau Belukar) */}
      {canTiger && (
        <CubePetGroundWalker
          id="tiger"
          species="tiger"
          modelPath="/models/animal-tiger.glb"
          scale={0.32}
          phaseOffset={2.1}
          idleDuration={4.8}
          walkDuration={3.2}
          roamingTiles={tigerRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('tiger', tigerRoamingTiles[0])}
        />
      )}

      {/* 9. Polar Bear (Eksklusif Bioma Salju) */}
      {canPolar && (
        <CubePetGroundWalker
          id="polar"
          species="polar"
          modelPath="/models/animal-polar.glb"
          scale={0.32}
          phaseOffset={3.0}
          idleDuration={5.5}
          walkDuration={3.8}
          roamingTiles={polarRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('polar', polarRoamingTiles[0])}
        />
      )}

      {/* 10. Panda (Panda Santai) */}
      {canPanda && (
        <CubePetGroundWalker
          id="panda"
          species="panda"
          modelPath="/models/animal-panda.glb"
          scale={0.30}
          phaseOffset={1.8}
          idleDuration={6.2}
          walkDuration={3.0}
          roamingTiles={pandaRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('panda', pandaRoamingTiles[0])}
        />
      )}

      {/* 11. Tree Monkey (Pesenam Tajuk Dahan) */}
      {canMonkey && (
        <TreeMonkey
          branchWaypoints={monkeyBranchWaypoints}
          scale={0.22}
          phaseOffset={0.8}
          groundPositionsRef={groundPositionsRef}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('monkey', monkeyBranchWaypoints[0])}
        />
      )}

      {/* 12. Lion (Singa Sabana Raja Wibawa) */}
      {canLion && (
        <CubePetGroundWalker
          id="lion"
          species="lion"
          modelPath="/models/animal-lion.glb"
          scale={0.34}
          phaseOffset={4.2}
          idleDuration={5.2}
          walkDuration={3.6}
          roamingTiles={lionRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('lion', lionRoamingTiles[0])}
        />
      )}

      {/* 13. Hog (Babi Hutan Penjelajah Tanah) */}
      {canHog && (
        <CubePetGroundWalker
          id="hog"
          species="hog"
          modelPath="/models/animal-hog.glb"
          scale={0.26}
          phaseOffset={2.7}
          idleDuration={4.5}
          walkDuration={3.0}
          roamingTiles={hogRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('hog', hogRoamingTiles[0])}
        />
      )}

      {/* 14. Giraffe (Jerapah Sabana Pengamat Cakrawala) */}
      {canGiraffe && (
        <CubePetGroundWalker
          id="giraffe"
          species="giraffe"
          modelPath="/models/animal-giraffe.glb"
          scale={0.36}
          phaseOffset={3.5}
          idleDuration={5.8}
          walkDuration={3.8}
          roamingTiles={giraffeRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('giraffe', giraffeRoamingTiles[0])}
        />
      )}

      {/* 15. River Fish (Ikan Koi Sungai) - Strictly bounded within connected water networks */}
      {canFish &&
        riverPatrolNetworks.length > 0 &&
        riverPatrolNetworks.slice(0, 3).map((network, idx) => (
          <RiverFish
            key={`fish-${idx}`}
            id={`fish-${idx}`}
            riverWaypoints={network}
            scale={0.24}
            phaseOffset={idx * 2.3 + 1.4}
            isNight={isNight}
            onSelect={() => handleSelectSpecies('fish', network[0])}
          />
        ))}

      {/* 16. Cat (Kucing Kemah Dekat Tenda) */}
      {canCat && (
        <CubePetGroundWalker
          id="cat"
          species="cat"
          modelPath="/models/animal-cat.glb"
          scale={0.22}
          phaseOffset={0.9}
          idleDuration={5.0}
          walkDuration={2.8}
          roamingTiles={catRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('cat', catRoamingTiles[0])}
        />
      )}

      {/* 17. Beaver (Berang-berang Tepian Sungai) */}
      {canBeaver && (
        <CubePetGroundWalker
          id="beaver"
          species="beaver"
          modelPath="/models/animal-beaver.glb"
          scale={0.24}
          phaseOffset={2.3}
          idleDuration={4.8}
          walkDuration={3.2}
          roamingTiles={beaverRoamingTiles}
          groundPositionsRef={groundPositionsRef}
          isRiverZone={isRiverZone}
          isNight={isNight}
          onSelect={() => handleSelectSpecies('beaver', beaverRoamingTiles[0])}
        />
      )}

      {/* Floating 3D Hearts on Tap */}
      {hearts.map((h) => (
        <FloatingHeart key={h.id} position={h.position} />
      ))}
    </group>
  );
}
