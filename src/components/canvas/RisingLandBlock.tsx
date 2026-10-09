import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GAME_CONFIG } from '@/lib/game/config';
import { soundManager } from '@/lib/audio/sounds';
import { hapticSuccess } from '@/lib/mobile/nativeBridge';

interface RisingLandBlockProps {
  coordKey: string; // "grid_x,grid_y"
  activeBiome?: 'meadow' | 'snow';
  soilTexture?: THREE.CanvasTexture | null;
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
  activeBiome = 'meadow',
  onSettled,
}: RisingLandBlockProps) {
  const [gx, gy] = useMemo(() => coordKey.split(',').map(Number), [coordKey]);

  const tileSize = GAME_CONFIG.grid.tileSize;
  const offset = GAME_CONFIG.grid.offset;

  const cx = (gx + offset) * tileSize;
  const cz = (gy + offset) * tileSize;

  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Load Kenney modular land block based on active biome
  const modelUrl =
    activeBiome === 'snow'
      ? '/models/block-snow-low.glb'
      : '/models/block-grass-low.glb';
  const { scene } = useGLTF(modelUrl);

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

  // Spring physics variables
  const yRef = useRef<number>(-1.25);
  const velRef = useRef<number>(0);
  const hasTriggeredSplash = useRef<boolean>(false);
  const isSettledRef = useRef<boolean>(false);

  // Particle pool for water splash and golden dust
  const particleListRef = useRef<Particle[]>([]);

  // Sound & Haptic on start
  useEffect(() => {
    soundManager.playPop();
    hapticSuccess();
  }, []);

  // Water splash trigger helper
  const triggerWaterSplash = () => {
    soundManager.playWaterSplash();
    hapticSuccess();

    const newParticles: Particle[] = [];
    const waterColor = new THREE.Color(activeBiome === 'snow' ? '#BAE6FD' : '#38BDF8');
    const goldColor = new THREE.Color(activeBiome === 'snow' ? '#E0F2FE' : '#FBBF24');
    const emeraldColor = new THREE.Color(activeBiome === 'snow' ? '#FFFFFF' : '#34D399');

    // 28 Water Splash Droplets
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
      onSettled(coordKey);
    }

    // Animate splash particles
    const list = particleListRef.current;
    if (list.length > 0 && particlesRef.current) {
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particleGeo.getAttribute('color') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const colArr = colAttr.array as Float32Array;

      let anyAlive = false;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.life += dt;
        if (p.life < p.maxLife) {
          anyAlive = true;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 9.8 * dt; // Gravity

          const progress = p.life / p.maxLife;
          const fade = 1 - progress;

          const idx = i * 3;
          posArr[idx] = cx + p.x;
          posArr[idx + 1] = p.y;
          posArr[idx + 2] = cz + p.z;

          colArr[idx] = p.color.r * fade;
          colArr[idx + 1] = p.color.g * fade;
          colArr[idx + 2] = p.color.b * fade;
        } else {
          // Hide dead particle below island
          const idx = i * 3;
          posArr[idx + 1] = -100;
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      if (!anyAlive && isSettledRef.current) {
        particleListRef.current = [];
      }
    }
  });

  return (
    <group>
      {/* Rising modular land block */}
      <group ref={groupRef} position={[0, -1.25, 0]}>
        <group position={[cx, -0.5, cz]}>
          <primitive object={clonedScene} />
        </group>

        {/* Emergence Pulse Glow on Edge */}
        <mesh position={[cx, 0.03, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[tileSize * 0.98, tileSize * 0.98]} />
          <meshBasicMaterial
            color={activeBiome === 'snow' ? '#7DD3FC' : '#34D399'}
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
