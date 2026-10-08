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

export function FocusSapling() {
  const activeSession = useGameStore((state) => state.activeSession);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );
  const groupRef = useRef<THREE.Group>(null);
  const currentScaleRef = useRef(0);
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);

  const unlockedSet = useMemo(() => {
    const state = useGameStore.getState();
    return getUnlockedTilesSet(state.saveData.world, state.saveData.world_objects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedSignature]);

  // Compute exact world position where the completed focus tree will spawn
  const saplingWorldPos = useMemo<[number, number, number]>(() => {
    const targetTile = findEmptyTileNearCenter(worldObjects, unlockedSet);
    if (!targetTile) return [0, 0.05, 0];
    return gridToWorld(targetTile.grid_x, targetTile.grid_y, 0.05);
  }, [worldObjects, unlockedSet]);

  const species = (activeSession?.species || 'oak') as TreeSpecies;
  const speciesConfig =
    TREE_SPECIES_CONFIG.find((s) => s.id === species) || TREE_SPECIES_CONFIG[0];

  const matureModelPath = useMemo(() => {
    const modelVariant = speciesConfig?.modelVariant || 'tree_oak';
    return `/models/${modelVariant}.glb`;
  }, [speciesConfig]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (!activeSession || activeSession.status !== 'active') {
      currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, 0, 0.15);
      groupRef.current.scale.setScalar(currentScaleRef.current);
      groupRef.current.visible = currentScaleRef.current > 0.01;
      return;
    }

    groupRef.current.visible = true;

    const now = Date.now();
    const start = new Date(activeSession.started_at).getTime();
    const end = new Date(activeSession.expected_end_at).getTime();
    const totalDuration = Math.max(1000, end - start);
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
    <group position={saplingWorldPos}>
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
