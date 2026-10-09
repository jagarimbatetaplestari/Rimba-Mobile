import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '@/lib/game/useGameStore';
import { TREE_SPECIES_CONFIG } from '@/lib/game/config';
import {
  findEmptyTileNearCenter,
  getUnlockedTilesSet,
  getUnlockedTilesSignature,
  gridToWorld,
} from '@/lib/game/worldRules';
import { TreeSpecies } from '@/types/game';

// Preload models for growth stages
useGLTF.preload('/models/plant_bushSmall.glb');
useGLTF.preload('/models/tree_small.glb');
useGLTF.preload('/models/tree_default.glb');
useGLTF.preload('/models/kenney_survival_kit_campfire-pit.glb');
useGLTF.preload('/models/fauna_fox.glb');
useGLTF.preload('/models/fauna_koala.glb');
useGLTF.preload('/models/animal-deer.glb');

interface ModelMeshProps {
  modelPath: string;
  leafColor?: string;
  barkColor?: string;
}

function ModelMesh({ modelPath, leafColor, barkColor = '#B87B40' }: ModelMeshProps) {
  const { scene } = useGLTF(modelPath);

  const { clonedScene, materials } = useMemo(() => {
    const cloned = scene.clone(true);
    const clonedMaterials: THREE.Material[] = [];
    const naturalLeaf = new THREE.Color(leafColor || '#82C84A');
    const naturalBark = new THREE.Color(barkColor);

    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          clonedMaterials.push(mat);
          const isLeaf =
            mat.name === 'leafsGreen' ||
            mat.name.toLowerCase().includes('leaf') ||
            mat.name.toLowerCase().includes('leaves') ||
            (mat.color && mat.color.r < 0.45 && mat.color.g > 0.55);

          const isTrunk =
            mat.name === 'woodBark' ||
            mat.name.toLowerCase().includes('wood') ||
            mat.name.toLowerCase().includes('bark') ||
            mat.name.toLowerCase().includes('trunk');

          if (isLeaf) {
            mat.color = naturalLeaf.clone();
          } else if (isTrunk) {
            mat.color = naturalBark.clone();
          }

          mat.roughness = 0.78;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });

    return { clonedScene: cloned, materials: clonedMaterials };
  }, [scene, leafColor, barkColor]);

  useEffect(() => {
    return () => {
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  return <primitive object={clonedScene} />;
}

function CompanionAvatarModel({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={0.16} />;
}

function CampfirePresence3D({ companions = [] }: { companions?: string[] }) {
  const { scene: pitScene } = useGLTF('/models/kenney_survival_kit_campfire-pit.glb');
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (flameRef.current) {
      const flicker = 1 + Math.sin(t * 14) * 0.12 + Math.cos(t * 22) * 0.08;
      flameRef.current.scale.set(
        0.18 * flicker,
        (0.28 + Math.sin(t * 10) * 0.04) * flicker,
        0.18 * flicker
      );
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.4 + Math.sin(t * 12) * 0.3;
    }
  });

  const clonedPit = useMemo(() => pitScene.clone(true), [pitScene]);

  const companionSlots = [
    { pos: [0.55, 0, 0], rot: -Math.PI / 2, model: '/models/fauna_fox.glb' },
    { pos: [-0.48, 0, 0.32], rot: Math.PI / 3, model: '/models/fauna_koala.glb' },
    { pos: [-0.38, 0, -0.42], rot: Math.PI * 0.7, model: '/models/animal-deer.glb' },
  ];

  return (
    <group position={[0.82, 0, 0.15]}>
      {/* Campfire Pit Base */}
      <primitive object={clonedPit} scale={0.65} />

      {/* Dynamic Flickering Fire Core */}
      <mesh ref={flameRef} position={[0, 0.14, 0]}>
        <coneGeometry args={[0.16, 0.3, 8]} />
        <meshBasicMaterial color="#FFA000" />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.25, 0]}
        color="#FF8C00"
        distance={2.6}
        decay={2}
      />

      {/* Animal Companions sitting around fire */}
      {companions.slice(0, 3).map((name, idx) => {
        const slot = companionSlots[idx];
        if (!slot) return null;
        return (
          <group
            key={name + idx}
            position={slot.pos as [number, number, number]}
            rotation={[0, slot.rot, 0]}
          >
            <CompanionAvatarModel modelPath={slot.model} />
          </group>
        );
      })}
    </group>
  );
}

export function FocusSapling() {
  const activeSession = useGameStore((state) => state.activeSession);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );
  const groupRef = useRef<THREE.Group>(null);
  const currentScaleRef = useRef(0);
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);

  // Lock sapling target tile for the duration of this specific session
  // Prevents the sapling from jumping to an adjacent tile when completeFocus adds the tree to worldObjects
  const lockedTileRef = useRef<{ grid_x: number; grid_y: number } | null>(null);
  const lastSessionIdRef = useRef<string | null>(null);

  const unlockedSet = useMemo(() => {
    const state = useGameStore.getState();
    return getUnlockedTilesSet(state.saveData.world, state.saveData.world_objects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedSignature]);

  if (activeSession && activeSession.id !== lastSessionIdRef.current) {
    lastSessionIdRef.current = activeSession.id;
    const targetTile = findEmptyTileNearCenter(worldObjects, unlockedSet);
    lockedTileRef.current = targetTile ? { grid_x: targetTile.grid_x, grid_y: targetTile.grid_y } : null;
  } else if (!activeSession) {
    lastSessionIdRef.current = null;
    lockedTileRef.current = null;
  }

  // Compute exact world position where the completed focus tree will spawn
  const saplingWorldPos = useMemo<[number, number, number]>(() => {
    const targetTile =
      activeSession?.target_tile ||
      lockedTileRef.current ||
      findEmptyTileNearCenter(worldObjects, unlockedSet);
    if (!targetTile) return [0, 0.05, 0];
    return gridToWorld(targetTile.grid_x, targetTile.grid_y, 0.05);
  }, [activeSession?.target_tile, worldObjects, unlockedSet]);

  const species = (activeSession?.species || 'oak') as TreeSpecies;
  const speciesConfig =
    TREE_SPECIES_CONFIG.find((s) => s.id === species) || TREE_SPECIES_CONFIG[0];

  const matureModelPath = useMemo(() => {
    const modelVariant = speciesConfig?.modelVariant || 'tree_oak';
    return `/models/${modelVariant}.glb`;
  }, [speciesConfig]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Immediately hide when session is no longer active so it never flickers or ghosts onto adjacent tiles
    if (!activeSession || activeSession.status !== 'active') {
      currentScaleRef.current = 0;
      groupRef.current.scale.setScalar(0);
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    const now = Date.now();
    const start = new Date(activeSession.started_at).getTime();
    const end = new Date(activeSession.expected_end_at).getTime();
    // For Stopwatch (Durasi Bebas) mode, tree growth reaches maturity at 5 minutes (300,000 ms)
    const totalDuration = activeSession.is_stopwatch
      ? 300000
      : Math.max(1000, end - start);
    const elapsed = Math.max(0, now - start);
    const rawProgress = Math.min(1, elapsed / totalDuration);

    // Determine growth stage:
    // Stage 1 (0% - 30%): Sprout (plant_bushSmall)
    // Stage 2 (30% - 75%): Sapling (tree_small)
    // Stage 3 (75% - 100%): Mature Tree (Selected Species)
    let nextStage: 1 | 2 | 3 = 1;
    let stageProgress = 0;
    let baseTargetScale = 0.5;

    if (rawProgress < 0.3) {
      nextStage = 1;
      stageProgress = rawProgress / 0.3;
      baseTargetScale = 0.35 + stageProgress * 0.35; // 0.35 -> 0.70
    } else if (rawProgress < 0.75) {
      nextStage = 2;
      stageProgress = (rawProgress - 0.3) / 0.45;
      baseTargetScale = 0.65 + stageProgress * 0.35; // 0.65 -> 1.00
    } else {
      nextStage = 3;
      stageProgress = (rawProgress - 0.75) / 0.25;
      baseTargetScale = 0.85 + stageProgress * 0.3; // 0.85 -> 1.15
    }

    if (nextStage !== currentStage) {
      setCurrentStage(nextStage);
    }

    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      baseTargetScale,
      0.08
    );

    // Subtle gentle breathing pulse
    const pulse = 1 + Math.sin(now * 0.003) * 0.02;
    groupRef.current.scale.setScalar(currentScaleRef.current * pulse);

    // Rotate very slowly for diorama charm
    groupRef.current.rotation.y = now * 0.0003;
  });

  return (
    <group
      position={saplingWorldPos}
      onClick={(e) => {
        e.stopPropagation();
        if (!activeSession) return;
        const now = Date.now();
        const end = new Date(activeSession.expected_end_at).getTime();
        const isReady = activeSession.is_stopwatch
          ? now - new Date(activeSession.started_at).getTime() >= 300000
          : now >= end - 1000;
        if (isReady && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rimba:open_harvest'));
        }
      }}
    >
      {/* Grove Sacred Pedestal Ring (Hanya muncul saat sesi fokus aktif) */}
      {activeSession?.status === 'active' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshStandardMaterial
            color="#A8D49B"
            roughness={0.9}
            metalness={0.0}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}

      {/* Active Campfire Room Presence if focusing with companions */}
      {activeSession?.status === 'active' && Boolean(activeSession?.campfire_room_code) && (
        <CampfirePresence3D companions={activeSession.companions} />
      )}

      {/* Focus Tree Group with 3 Dynamic Stages */}
      <group ref={groupRef} visible={false}>
        {currentStage === 1 && (
          <ModelMesh
            modelPath="/models/plant_bushSmall.glb"
            leafColor="#98D85B"
          />
        )}
        {currentStage === 2 && (
          <ModelMesh
            modelPath="/models/tree_small.glb"
            leafColor={speciesConfig.leafColor}
          />
        )}
        {currentStage === 3 && (
          <ModelMesh
            modelPath={matureModelPath}
            leafColor={speciesConfig.leafColor}
          />
        )}

        {/* Soft Golden Focus Aura Ring */}
        <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.55, 24]} />
          <meshBasicMaterial
            color="#FCD34D"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
