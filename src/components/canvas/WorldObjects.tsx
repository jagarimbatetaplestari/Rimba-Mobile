import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { WorldObject } from '@/types/game';
import { gridToWorld, getUnlockedTilesSignature } from '@/lib/game/worldRules';
import { useGameStore } from '@/lib/game/useGameStore';
import { ASSET_MANIFEST, getManifestItem } from '@/lib/game/assetManifest';
import { BulldozerMarker } from './BulldozerMarker';
import { ConstructionCones } from './ConstructionCones';
import {
  buildRiverTileMap,
  getRiverWaterGeometry,
  getRiverPebbles,
  RiverAdjacency,
} from '@/lib/game/riverSystem';

// Eagerly preload only the 3 starter models needed on initial island render
const STARTER_MODEL_PATHS = [
  '/models/kenney_nature_kit_tree_oak.glb',
  '/models/kenney_nature_kit_rock_largeA.glb',
  '/models/kenney_nature_kit_path_stone.glb',
];
STARTER_MODEL_PATHS.forEach((path) => {
  useGLTF.preload(path);
});

const preloadedPaths = new Set<string>(STARTER_MODEL_PATHS);

export function preloadModelPath(path: string) {
  if (!path || preloadedPaths.has(path)) return;
  preloadedPaths.add(path);
  useGLTF.preload(path);
}

export function preloadAllManifestModels(category?: string) {
  const items = category
    ? ASSET_MANIFEST.filter((item) => item.category === category)
    : ASSET_MANIFEST;

  items.forEach((item, index) => {
    if (preloadedPaths.has(item.modelPath)) return;
    setTimeout(() => {
      preloadModelPath(item.modelPath);
    }, index * 35);
  });
}

interface ConnectedRiverTileProps {
  adjacency: RiverAdjacency;
}

function ConnectedRiverTile({ adjacency }: ConnectedRiverTileProps) {
  const waterGeo = useMemo(() => getRiverWaterGeometry(adjacency.mask), [adjacency.mask]);
  const pebbles = useMemo(() => getRiverPebbles(adjacency.mask), [adjacency.mask]);

  return (
    <group>
      {/* 1. Seamless Shimmering Azure Water Surface */}
      <mesh geometry={waterGeo} receiveShadow renderOrder={1}>
        <meshStandardMaterial
          color="#38BDF8"
          transparent
          opacity={0.88}
          roughness={0.08}
          metalness={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Decorative River Pebbles along unconnected shores */}
      {pebbles.map((p, idx) => (
        <mesh
          key={idx}
          position={p.pos}
          scale={p.scale}
          rotation={[0, p.rot, 0]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#8E887E' : '#A8A196'}
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

interface ObjectItemProps {
  object: WorldObject;
  isSelected: boolean;
  onSelect: (obj: WorldObject) => void;
  riverAdjacency?: RiverAdjacency;
}

function ObjectItem({ object, isSelected, onSelect, riverAdjacency }: ObjectItemProps) {
  // Resolve model path from asset manifest
  const manifestItem = useMemo(
    () => getManifestItem(object.model_variant),
    [object.model_variant]
  );

  const modelPath = useMemo(() => {
    if (manifestItem) return manifestItem.modelPath;

    // Fallbacks
    if (object.object_type === 'tree') {
      return '/models/kenney_nature_kit_tree_oak.glb';
    }
    if (object.object_type === 'rock') {
      return '/models/kenney_nature_kit_rock_largeA.glb';
    }
    return '/models/kenney_nature_kit_path_stone.glb';
  }, [object.object_type, manifestItem]);

  const { scene } = useGLTF(modelPath);

  // Clone scene and apply natural PBR materials (Task 3: Eliminate teal placeholders)
  const { clonedScene, materials } = useMemo(() => {
    const cloned = scene.clone(true);
    const clonedMaterials: THREE.Material[] = [];
    const isReclaimed = object.status === 'reclaimed';

    // Resolve species-specific leaf color
    const variant = (object.model_variant || '').toLowerCase();
    let naturalLeafColor = new THREE.Color('#82C84A'); // Default spring oak
    if (variant.includes('fall') || variant.includes('autumn')) {
      naturalLeafColor = new THREE.Color('#D97706'); // Warm golden-orange
    } else if (variant.includes('pine')) {
      naturalLeafColor = new THREE.Color('#2E6B3D'); // Conifer dark evergreen
    } else if (variant.includes('palm')) {
      naturalLeafColor = new THREE.Color('#4E9A38'); // Coastal tropical frond
    } else if (variant.includes('detailed')) {
      naturalLeafColor = new THREE.Color('#3E8E41'); // Deep ancient elder
    }

    const naturalBarkColor = new THREE.Color('#B87B40');

    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // DO NOT call computeVertexNormals() - Kenney GLTF primitives share vertex buffers,
        // calling computeVertexNormals wipes unindexed vertex normals to (0,0,0), turning meshes pitch-black!

        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          const isCustomBaked = mat.name.startsWith('custom_');

          if (isReclaimed) {
            // Reclaimed: overgrown mossy texture
            const reclaimedMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#558244'),
              roughness: 0.92,
              metalness: 0.0,
              map: mat.map || null,
            });
            mat.dispose();
            clonedMaterials.push(reclaimedMat);
            mesh.material = reclaimedMat;
          } else if (isCustomBaked) {
            // Preserve calibrated multi-tone palette of newly optimized low-poly assets
            if (mat.name === 'custom_water') {
              mat.transparent = true;
              mat.opacity = 0.84;
              mat.roughness = 0.14;
              mat.metalness = 0.08;
            } else {
              mat.roughness = 0.84;
              mat.metalness = 0.0;
            }
            clonedMaterials.push(mat);
            mesh.material = mat;
          } else {
            const matNameLower = mat.name.toLowerCase();
            const isLeaf =
              mat.name === 'leafsGreen' ||
              matNameLower.includes('leaf') ||
              matNameLower.includes('leaves') ||
              (object.object_type === 'tree' && mat.color && mat.color.r < 0.45 && mat.color.g > 0.55);

            const isTrunkOrTealWood =
              mat.name === 'woodBark' ||
              matNameLower.includes('bark') ||
              (mat.color && mat.color.r < 0.35 && mat.color.g > 0.42 && mat.color.b > 0.32);

            if (isLeaf) {
              mat.color = naturalLeafColor.clone();
            } else if (isTrunkOrTealWood) {
              mat.color = naturalBarkColor.clone();
            } else if (
              object.object_type === 'rock' &&
              (mat.name === '_defaultMat' || mat.name === 'stone' || mat.name === 'dirt' || mat.name === 'grass')
            ) {
              mat.color = new THREE.Color('#9E9A92');
            }

            mat.roughness = object.object_type === 'rock' ? 0.90 : 0.84;
            mat.metalness = 0.0;
            clonedMaterials.push(mat);
            mesh.material = mat;
          }
        }
      }
    });

    return { clonedScene: cloned, materials: clonedMaterials };
  }, [scene, object.status, object.model_variant, object.object_type]);

  useEffect(() => {
    return () => {
      materials.forEach((m) => m.dispose());
    };
  }, [materials]);

  const variantLower = (object.model_variant || '').toLowerCase();
  const isRiver = variantLower.includes('river');
  const isBridge = variantLower.includes('bridge');

  const yOffset = isRiver ? 0.0 : isBridge ? 0.02 : 0.05;
  const [x, rawY, z] = gridToWorld(object.grid_x, object.grid_y, yOffset);
  // All river water across the diorama island shares uniform level Y = 0.012 for 100% seamless liquid joining
  const y = isRiver ? 0.012 : rawY;

  // River tiles use exact 1.0 scale so adjacent stream segments connect edge-to-edge without seams
  const baseScale = isRiver
    ? 1.0
    : isBridge
    ? manifestItem?.defaultScale || 1.06
    : object.scale || manifestItem?.defaultScale || 1.15;
  const clampedScale = isRiver ? 1.0 : Math.max(0.85, Math.min(1.45, baseScale));

  return (
    <group
      position={[x, y, z]}
      rotation={isRiver ? [0, 0, 0] : [0, object.rotation, 0]}
      scale={[clampedScale, clampedScale, clampedScale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(object);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* If river tile, render auto-connecting seamless river system instead of static glb */}
      {isRiver ? (
        <ConnectedRiverTile
          adjacency={
            riverAdjacency || {
              north: false,
              south: false,
              west: false,
              east: false,
              count: 0,
              mask: 0,
            }
          }
        />
      ) : (
        <primitive object={clonedScene} />
      )}

      {/* Translucent azure river water flowing underneath bridge arches (0.82m wide) */}
      {isBridge && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.82, 1.02]} />
          <meshStandardMaterial
            color="#38BDF8"
            transparent
            opacity={0.88}
            roughness={0.08}
            metalness={0.15}
          />
        </mesh>
      )}

      {/* Selected Indicator Ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.65, 32]} />
          <meshBasicMaterial
            color={object.status === 'reclaimed' ? '#E5A93C' : '#FFFFFF'}
            transparent
            opacity={0.8}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Marked for Clearing Warning Ring */}
      {object.status === 'marked_for_clearing' && (
        <group position={[0, 0.03, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.72, 32]} />
            <meshBasicMaterial color="#F59E0B" transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.76, 0.82, 32]} />
            <meshBasicMaterial color="#FBBF24" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function WorldObjects() {
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const world = useGameStore((state) => state.saveData.world);
  const selectedObject = useGameStore((state) => state.selectedObject);
  const setSelectedObject = useGameStore((state) => state.setSelectedObject);
  const relocatingObjectId = useGameStore((state) => state.relocatingObjectId);

  const unlockedSignature = useMemo(
    () => getUnlockedTilesSignature(world, worldObjects),
    [world, worldObjects]
  );
  const unlockedSet = useMemo(() => {
    return new Set(unlockedSignature ? unlockedSignature.split('|') : []);
  }, [unlockedSignature]);

  const riverTileMap = useMemo(() => {
    return buildRiverTileMap(worldObjects, unlockedSet);
  }, [worldObjects, unlockedSet]);

  // Schedule lightweight idle preloading of the starter category ('Trees') after initial paint;
  // other categories are preloaded on demand when the user opens or switches tabs in Nature Workshop.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => preloadAllManifestModels('Trees'));
      } else {
        preloadAllManifestModels('Trees');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <group>
      {worldObjects.map((obj) => {
        if (obj.id === relocatingObjectId) return null;
        return (
          <React.Suspense key={obj.id} fallback={null}>
            <ObjectItem
              object={obj}
              isSelected={selectedObject?.id === obj.id}
              onSelect={setSelectedObject}
              riverAdjacency={riverTileMap.get(`${obj.grid_x},${obj.grid_y}`)}
            />
          </React.Suspense>
        );
      })}

      {/* Active Bulldozer Threat & Construction Cones */}
      {world.bulldozer && world.bulldozer.active && (
        <>
          <BulldozerMarker
            bulldozer={world.bulldozer}
            isSelected={selectedObject?.id === 'obj_bulldozer'}
            onSelect={() =>
              setSelectedObject({
                id: 'obj_bulldozer',
                object_type: 'rock',
                grid_x: -1,
                grid_y: -1,
                rotation: 0,
                status: 'active',
                created_at: new Date().toISOString(),
                reclaimed_at: null,
                model_variant: 'car_tractor_shovel',
              })
            }
          />
          <ConstructionCones positions={world.bulldozer.cone_positions} />
        </>
      )}
    </group>
  );
}
