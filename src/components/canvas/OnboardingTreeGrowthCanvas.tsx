'use client';

import React, { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';

interface TreeStageModelProps {
  modelPath: string;
  leafColor?: string;
  barkColor?: string;
  scale?: number;
}

function TreeStageModel({
  modelPath,
  leafColor = '#82C84A',
  barkColor = '#B87B40',
  scale = 1,
}: TreeStageModelProps) {
  const { scene } = useGLTF(modelPath);
  const meshRef = useRef<THREE.Group>(null);

  const { clonedScene } = useMemo(() => {
    const cloned = scene.clone(true);
    const naturalLeaf = new THREE.Color(leafColor);
    const naturalBark = new THREE.Color(barkColor);

    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
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
            mat.color = naturalLeaf;
          } else if (isTrunk) {
            mat.color = naturalBark;
          }
          mat.roughness = 0.78;
          mat.metalness = 0.0;
          mesh.material = mat;
        }
      }
    });
    return { clonedScene: cloned };
  }, [scene, leafColor, barkColor]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.65;
    }
  });

  return (
    <group ref={meshRef} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

function SceneContent({ progress }: { progress: number }) {
  // Matching FocusSapling.tsx thresholds:
  // Stage 1 (0% - 30%): Sprout (plant_bushSmall)
  // Stage 2 (30% - 75%): Sapling (tree_small)
  // Stage 3 (75% - 100%): Mature Tree (tree_default)
  let stage: 1 | 2 | 3 = 1;
  let modelPath = '/models/plant_bushSmall.glb';
  let targetScale = 0.85;

  if (progress < 30) {
    stage = 1;
    modelPath = '/models/plant_bushSmall.glb';
    targetScale = 0.75 + (progress / 30) * 0.35;
  } else if (progress < 75) {
    stage = 2;
    modelPath = '/models/tree_small.glb';
    targetScale = 0.7 + ((progress - 30) / 45) * 0.3;
  } else {
    stage = 3;
    modelPath = '/models/tree_default.glb';
    targetScale = 0.75 + ((progress - 75) / 25) * 0.25;
  }

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 5, 2]} intensity={2.2} color="#FFFCE6" />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#D1FAE5" />

      {/* Mini Island Pedestal with soft moss grass */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.75, 0.7, 0.16, 32]} />
        <meshStandardMaterial color="#2E5C2A" roughness={0.85} />
      </mesh>

      {/* Subtle soil rim */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.7, 0.62, 0.1, 32]} />
        <meshStandardMaterial color="#4A3525" roughness={0.9} />
      </mesh>

      {/* Floating Rotating Tree with organic breath */}
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.15}>
        <group position={[0, -0.06, 0]}>
          <TreeStageModel
            key={`${stage}-${modelPath}`}
            modelPath={modelPath}
            scale={targetScale}
          />
        </group>
      </Float>
    </>
  );
}

export function OnboardingTreeGrowthCanvas({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full relative select-none pointer-events-none">
      <Canvas
        camera={{ position: [0, 1.1, 2.1], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneContent progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload models for instant smooth transitions
useGLTF.preload('/models/plant_bushSmall.glb');
useGLTF.preload('/models/tree_small.glb');
useGLTF.preload('/models/tree_default.glb');
