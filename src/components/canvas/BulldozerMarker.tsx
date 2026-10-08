import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { BulldozerThreat } from '@/types/game';
import { soundManager } from '@/lib/audio/sounds';
import { hapticWarning, hapticSuccess } from '@/lib/mobile/nativeBridge';

useGLTF.preload('/models/car_tractor_shovel.glb');

interface BulldozerMarkerProps {
  bulldozer: BulldozerThreat;
  isSelected?: boolean;
  onSelect?: () => void;
}

interface SmokePuff {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  opacity: number;
}

export function BulldozerMarker({
  bulldozer,
  isSelected,
  onSelect,
}: BulldozerMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const smokePointsRef = useRef<THREE.Points>(null);

  const { scene } = useGLTF('/models/car_tractor_shovel.glb');

  // Retreat Drive-off state
  const [isRetreating, setIsRetreating] = useState<boolean>(false);
  const retreatProgressRef = useRef<number>(0);

  // Smoke particles state (ring buffer of 18 puffs)
  const smokePuffsRef = useRef<SmokePuff[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);

  // Clone scene cleanly preserving textures and enabling PBR shadows
  const { clonedScene, clonedMaterials } = useMemo(() => {
    const cloned = scene.clone(true);
    const materials: THREE.Material[] = [];
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
          mat.roughness = 0.75;
          mat.metalness = 0.1;
          mesh.material = mat;
          materials.push(mat);
        }
      }
    });
    return { clonedScene: cloned, clonedMaterials: materials };
  }, [scene]);

  // Clean up cloned materials on unmount to prevent WebGL resource leaks
  useEffect(() => {
    return () => {
      clonedMaterials.forEach((m) => m.dispose());
    };
  }, [clonedMaterials]);

  // Listen for retreat drive-off event
  useEffect(() => {
    const handleRetreat = () => {
      setIsRetreating(true);
      retreatProgressRef.current = 0;
      soundManager.playLevelUp();
      hapticSuccess();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FBBF24'],
        });
      } catch {}
    };

    window.addEventListener('rimba:bulldozer_retreat', handleRetreat);
    return () => window.removeEventListener('rimba:bulldozer_retreat', handleRetreat);
  }, []);

  // Geometry buffer for smoke particles
  const smokeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 20;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => smokeGeo.dispose();
  }, [smokeGeo]);

  // Animation Loop: Idle engine rumble, exhaust smoke puffing, beacon flashing, & retreat
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    if (groupRef.current) {
      if (!isRetreating) {
        // High-frequency engine rumble vibration (diesel motor idling)
        const rumbleX = Math.sin(t * 46) * 0.003;
        const rumbleZ = Math.cos(t * 38) * 0.002;
        const bobY = Math.sin(t * 2.8) * 0.012;

        groupRef.current.position.x = bulldozer.position[0] + rumbleX;
        groupRef.current.position.y = bulldozer.position[1] + bobY;
        groupRef.current.position.z = bulldozer.position[2] + rumbleZ;
        groupRef.current.scale.set(0.6, 0.6, 0.6);
      } else {
        // Retreat drive-off: drives backward towards water edge & shrinks
        retreatProgressRef.current += dt * 0.75;
        const p = Math.min(1.0, retreatProgressRef.current);

        // Heading vector backward
        const backX = Math.sin(bulldozer.rotation) * p * 2.5;
        const backZ = Math.cos(bulldozer.rotation) * p * 2.5;

        groupRef.current.position.x = bulldozer.position[0] - backX;
        groupRef.current.position.y = bulldozer.position[1] - p * 0.6; // sinking below shore
        groupRef.current.position.z = bulldozer.position[2] - backZ;

        // Scale fade out
        const sc = Math.max(0.01, 0.6 * (1 - p * 0.8));
        groupRef.current.scale.set(sc, sc, sc);
      }
    }

    // Flashing amber beacon
    const pulse = 0.4 + Math.abs(Math.sin(t * 3.5)) * 1.6;
    if (beaconRef.current) {
      const mat = beaconRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = pulse;
      }
    }
    if (lightRef.current) {
      lightRef.current.intensity = pulse * 0.8;
    }

    // Exhaust Smoke Puff System
    // Pipe local position relative to bulldozer: [-0.22, 1.25, -0.42]
    if (t - lastSpawnTimeRef.current > (isRetreating ? 0.07 : 0.14)) {
      lastSpawnTimeRef.current = t;
      if (smokePuffsRef.current.length < 20) {
        smokePuffsRef.current.push({
          x: -0.22 + (Math.random() - 0.5) * 0.05,
          y: 1.28,
          z: -0.42 + (Math.random() - 0.5) * 0.05,
          vx: (Math.random() - 0.5) * 0.15,
          vy: 0.8 + Math.random() * 0.6,
          vz: -0.3 + (Math.random() - 0.5) * 0.15,
          life: 0,
          maxLife: 0.85 + Math.random() * 0.35,
          scale: 0.05,
          opacity: 0.75,
        });
      }
    }

    // Update Smoke Particles
    if (smokePuffsRef.current.length > 0 && smokePointsRef.current) {
      const posAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = smokeGeo.getAttribute('color') as THREE.BufferAttribute;

      const activePuffs: SmokePuff[] = [];
      const smokeTint = isRetreating
        ? new THREE.Color('#F0FDF4') // Peaceful white/green retreat steam
        : new THREE.Color('#475569'); // Industrial grey diesel exhaust smoke

      for (let i = 0; i < smokePuffsRef.current.length; i++) {
        const p = smokePuffsRef.current[i];
        p.life += dt;
        if (p.life < p.maxLife) {
          const ratio = p.life / p.maxLife;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.scale = 0.06 + ratio * 0.22;
          p.opacity = Math.max(0, 0.75 * (1 - ratio));

          posAttr.setXYZ(i, p.x, p.y, p.z);
          colAttr.setXYZ(i, smokeTint.r * p.opacity, smokeTint.g * p.opacity, smokeTint.b * p.opacity);
          activePuffs.push(p);
        } else {
          posAttr.setXYZ(i, 0, -20, 0);
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      smokePuffsRef.current = activePuffs;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    hapticWarning();
    soundManager.playPop();

    // Cinematic camera focus event
    window.dispatchEvent(
      new CustomEvent('rimba:camera_focus_target', {
        detail: {
          position: [bulldozer.position[0], bulldozer.position[1], bulldozer.position[2]],
          distance: 9.5,
        },
      })
    );

    onSelect?.();
  };

  return (
    <group
      ref={groupRef}
      position={[bulldozer.position[0], bulldozer.position[1], bulldozer.position[2]]}
      rotation={[0, bulldozer.rotation, 0]}
      scale={[0.6, 0.6, 0.6]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />

      {/* Flashing Amber Warning Beacon on Cab */}
      <mesh ref={beaconRef} position={[0, 1.25, -0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#F59E0B"
          emissive="#F59E0B"
          emissiveIntensity={1.5}
          roughness={0.2}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 1.35, -0.1]}
        color="#F59E0B"
        intensity={1.2}
        distance={2.5}
      />

      {/* Exhaust Smoke Puff Particle Cloud */}
      <points ref={smokePointsRef} geometry={smokeGeo}>
        <pointsMaterial
          size={0.14}
          vertexColors
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* Selection Ground Ring (Only visible when explicitly tapped/selected) */}
      {isSelected && !isRetreating && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.05, 32]} />
          <meshBasicMaterial
            color="#F59E0B"
            transparent
            opacity={0.75}
          />
        </mesh>
      )}
    </group>
  );
}
