import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

useGLTF.preload('/models/car_cone.glb');

interface ConstructionConesProps {
  positions: [[number, number, number], [number, number, number]];
}

export function ConstructionCones({ positions }: ConstructionConesProps) {
  const { scene } = useGLTF('/models/car_cone.glb');

  const clonedScenes = useMemo(() => {
    return positions.map(() => {
      const cloned = scene.clone(true);
      cloned.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.material) {
            const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
            mat.color.set('#ffffff');
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
            }
            mat.roughness = 0.70;
            mesh.material = mat;
          }
        }
      });
      return cloned;
    });
  }, [scene, positions]);

  return (
    <group>
      {positions.map((pos, idx) => (
        <group
          key={idx}
          position={[pos[0], pos[1], pos[2]]}
          rotation={[0, idx * 1.5, 0]}
          scale={[0.7, 0.7, 0.7]}
        >
          <primitive object={clonedScenes[idx]} />

          {/* Soft Ground Shadow Disc */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 16]} />
            <meshBasicMaterial color="#1C2E18" transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
