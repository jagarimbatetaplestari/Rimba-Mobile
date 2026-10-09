import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGameStore } from '@/lib/game/useGameStore';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';
import { ATMOSPHERE_CONFIG } from '@/lib/game/config';
import { getUnlockedTilesSignature } from '@/lib/game/worldRules';
import { Island } from './Island';
import { InstancedGrass } from './InstancedGrass';
import { WorldObjects } from './WorldObjects';
import { FocusSapling } from './FocusSapling';
import { GridPlane } from './GridPlane';
import { WeatherEffects } from './WeatherEffects';
import { FaunaEcosystem } from './FaunaEcosystem';

function getAdaptiveCameraConfig(tileCount: number, isPortrait: boolean) {
  const count = Math.max(9, tileCount || 9);
  const baseCoord = Math.min(15.5, 6.0 + Math.sqrt(count) * 0.9);
  const yCoord = baseCoord * 0.94;

  if (isPortrait) {
    return {
      position: new THREE.Vector3(baseCoord, yCoord, baseCoord),
      fov: 42,
    };
  }
  const lCoord = baseCoord * 0.88;
  return {
    position: new THREE.Vector3(lCoord, yCoord * 0.88, lCoord),
    fov: 36,
  };
}

function ResponsiveCamera() {
  const { camera, size } = useThree();
  const unlockedCount = useGameStore(
    (state) => state.saveData.world.unlocked_tiles?.length || 9
  );

  useEffect(() => {
    const isPortrait = size.width < size.height;
    if (camera instanceof THREE.PerspectiveCamera) {
      const cfg = getAdaptiveCameraConfig(unlockedCount, isPortrait);
      camera.fov = cfg.fov;
      camera.position.copy(cfg.position);
      camera.updateProjectionMatrix();
    }
  }, [size.width, size.height, camera, unlockedCount]);
  return null;
}

function CameraEventListener() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const unlockedCount = useGameStore(
    (state) => state.saveData.world.unlocked_tiles?.length || 9
  );

  const animTargetRef = useRef<{
    camPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    active: boolean;
  } | null>(null);

  useFrame(() => {
    if (!animTargetRef.current?.active || !controlsRef.current) return;
    const { camPos, targetPos } = animTargetRef.current;
    camera.position.lerp(camPos, 0.07);
    controlsRef.current.target.lerp(targetPos, 0.07);
    controlsRef.current.update();

    if (camera.position.distanceTo(camPos) < 0.05 && controlsRef.current.target.distanceTo(targetPos) < 0.05) {
      animTargetRef.current.active = false;
    }
  });

  useEffect(() => {
    const handleCameraAction = (e: Event) => {
      const action = (e as CustomEvent).detail;
      const controls = controlsRef.current;
      if (!controls) return;

      const isPortrait =
        typeof window !== 'undefined' ? window.innerWidth < window.innerHeight : true;
      const adaptiveCfg = getAdaptiveCameraConfig(unlockedCount, isPortrait);

      if (action === 'reset') {
        animTargetRef.current = {
          camPos: adaptiveCfg.position.clone(),
          targetPos: new THREE.Vector3(0, 0, 0),
          active: true,
        };
      } else if (action === 'rotate_left') {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      } else if (action === 'rotate_right') {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      } else if (action === 'zoom_in') {
        const offset = camera.position.clone().sub(controls.target);
        if (offset.length() > 6.5) {
          offset.multiplyScalar(0.85);
          camera.position.copy(controls.target).add(offset);
          controls.update();
        }
      } else if (action === 'zoom_out') {
        const offset = camera.position.clone().sub(controls.target);
        if (offset.length() < 30) {
          offset.multiplyScalar(1.18);
          camera.position.copy(controls.target).add(offset);
          controls.update();
        }
      }
    };

    const handleFocusTarget = (e: Event) => {
      const detail = (e as CustomEvent<{ position: [number, number, number]; distance?: number }>).detail;
      const controls = controlsRef.current;
      if (!detail || !controls) return;
      const targetVec = new THREE.Vector3(...detail.position);
      const dist = detail.distance || 7.2;
      const desiredCam = new THREE.Vector3(
        targetVec.x + dist * 0.7,
        targetVec.y + dist * 0.8,
        targetVec.z + dist * 0.7
      );

      animTargetRef.current = {
        camPos: desiredCam,
        targetPos: targetVec,
        active: true,
      };
    };

    window.addEventListener('rimba:camera', handleCameraAction);
    window.addEventListener('rimba:camera_focus_target', handleFocusTarget);
    return () => {
      window.removeEventListener('rimba:camera', handleCameraAction);
      window.removeEventListener('rimba:camera_focus_target', handleFocusTarget);
    };
  }, [camera, unlockedCount]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={6}
      maxDistance={32}
      minPolarAngle={Math.PI / 4.5}
      maxPolarAngle={Math.PI / 2.2}
      enableDamping={true}
      dampingFactor={0.06}
    />
  );
}

export function Scene() {
  const backgroundTheme = useGameStore((state) => state.backgroundTheme);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const weather = useGameStore((state) => state.weather);
  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Dynamic Theme Palettes based on timeOfDay and user background preference
  const theme = useMemo(() => {
    if (timeOfDay === 'sunset') {
      return ATMOSPHERE_CONFIG.sunset;
    }
    if (timeOfDay === 'night') {
      return ATMOSPHERE_CONFIG.night;
    }
    // Default: 'day'
    if (backgroundTheme === 'matcha') {
      return {
        ...ATMOSPHERE_CONFIG.day,
        bgColor: '#EBF2E8',
        fogColor: '#EBF2E8',
        ambientColor: '#DFEDE0',
        skyBounce: '#EFF5E8',
        groundBounce: '#D6E8D0',
        sunColor: '#FFFCE8',
      };
    }
    return ATMOSPHERE_CONFIG.day;
  }, [timeOfDay, backgroundTheme]);

  // Dynamic Fog & Illumination adjustments based on weather
  const weatherAtmosphere = useMemo(() => {
    if (weather === 'mist') {
      return {
        fogColor:
          timeOfDay === 'night'
            ? '#14212D'
            : timeOfDay === 'sunset'
            ? '#DFB9A0'
            : backgroundTheme === 'matcha'
            ? '#DCEBE0'
            : '#DDE8E2',
        fogNear: 12,
        fogFar: 30,
        sunIntensityMultiplier: 0.85,
      };
    }
    if (weather === 'rain') {
      return {
        fogColor:
          timeOfDay === 'night'
            ? '#0E1B26'
            : timeOfDay === 'sunset'
            ? '#B89082'
            : backgroundTheme === 'matcha'
            ? '#C6DCD0'
            : '#B8CBD2',
        fogNear: 20,
        fogFar: 44,
        sunIntensityMultiplier: 0.72,
      };
    }
    // clear
    return {
      fogColor: theme.fogColor,
      fogNear: 36,
      fogFar: 60,
      sunIntensityMultiplier: 1.0,
    };
  }, [weather, timeOfDay, backgroundTheme, theme.fogColor]);

  const graphicsQuality = usePreferencesStore((state) => state.graphicsQuality);

  const grassCount = useMemo(() => {
    if (graphicsQuality === 'eco') return 3000;
    if (graphicsQuality === 'balanced') return 6000;
    return 9000;
  }, [graphicsQuality]);

  return (
    <Canvas
      frameloop={isVisible ? 'always' : 'never'}
      dpr={graphicsQuality === 'eco' ? [1, 1] : [1, 1.75]}
      gl={{
        preserveDrawingBuffer: true,
        antialias: graphicsQuality !== 'eco',
        powerPreference: 'high-performance',
        stencil: false,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      shadows={graphicsQuality !== 'eco' ? { type: THREE.PCFSoftShadowMap } : false}
      camera={{
        position: [18.0, 17.0, 18.0],
        fov: 42,
        near: 0.1,
        far: 100,
      }}
      className="w-full h-full"
    >
      <ResponsiveCamera />

      {/* Atmospheric depth fog at far distance */}
      <fog
        attach="fog"
        args={[
          weatherAtmosphere.fogColor,
          weatherAtmosphere.fogNear,
          weatherAtmosphere.fogFar,
        ]}
      />

      {/* Soft natural ambient fill */}
      <ambientLight color={theme.ambientColor} intensity={theme.ambientIntensity} />

      {/* Hemisphere Bounce Light: Illuminates shadowed faces so trees & soil walls never turn black */}
      <hemisphereLight args={[theme.skyBounce, theme.groundBounce, 0.65]} />

      {/* Main sun/moon directional light (Optimized shadow map according to graphicsQuality) */}
      <directionalLight
        position={theme.sunPosition}
        intensity={theme.sunIntensity * weatherAtmosphere.sunIntensityMultiplier}
        color={theme.sunColor}
        castShadow={graphicsQuality !== 'eco'}
        shadow-mapSize={graphicsQuality === 'ultra' ? [1024, 1024] : [512, 512]}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-7.5}
        shadow-camera-right={7.5}
        shadow-camera-top={7.5}
        shadow-camera-bottom={-7.5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Warm/cool fill light to softly illuminate the shaded sides */}
      <directionalLight
        position={[-12, 10, -12]}
        intensity={timeOfDay === 'night' ? 0.16 : 0.28}
        color={timeOfDay === 'night' ? '#3B5270' : timeOfDay === 'sunset' ? '#F7996E' : '#FDE8C8'}
      />

      {/* Soft floating diorama contact shadow beneath the island (baked once per layout/theme change) */}
      <ContactShadows
        key={`shadow-${timeOfDay}-${unlockedSignature}`}
        frames={1}
        position={[0, -0.92, 0]}
        opacity={theme.shadowOpacity}
        scale={18}
        blur={2.5}
        far={2.5}
        color={theme.contactShadowColor || (timeOfDay === 'night' ? '#080F17' : '#1E3A5F')}
      />

      {/* Dynamic Interactive Camera Handler & Orbit Controls */}
      <CameraEventListener />

      {/* Floating Diorama Island, Velvet Grass, Objects & Dynamic Weather */}
      <Suspense fallback={null}>
        <Island />
        <InstancedGrass count={grassCount} />
        <WorldObjects />
        <FocusSapling />
        <WeatherEffects />
        <FaunaEcosystem />
        <GridPlane />
      </Suspense>
    </Canvas>
  );
}
