import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { GAME_CONFIG } from '@/lib/game/config';
import {
  gridToWorld,
  isTileOccupied,
  worldToGrid,
  getTerrainElevation,
  getUnlockedTilesSet,
  getUnlockedTilesSignature,
  isTileUnlocked,
  canUnlockTile,
  getExpandableTiles,
  getLandExpansionZoneInfo,
} from '@/lib/game/worldRules';
import { useGameStore } from '@/lib/game/useGameStore';
import { canAfford } from '@/lib/game/economy';
import { soundManager } from '@/lib/audio/sounds';
import { getManifestItem } from '@/lib/game/assetManifest';
import { hapticLight } from '@/lib/mobile/nativeBridge';
import { useTranslation } from '@/lib/i18n/translations';

const EMPTY_SEALED_TILES: string[] = [];

function GhostObjectMesh({
  modelPath,
  isValid,
}: {
  modelPath: string;
  isValid: boolean;
}) {
  const { scene: ghostScene } = useGLTF(modelPath);

  const { coloredGhostScene, ghostMaterials } = useMemo(() => {
    const cloned = ghostScene.clone(true);
    const materials: THREE.Material[] = [];
    const tintColor = isValid ? new THREE.Color('#10B981') : new THREE.Color('#F43F5E');

    cloned.traverse((node: THREE.Object3D) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        if (mesh.material) {
          const origMat = mesh.material as THREE.MeshStandardMaterial;
          const mat = origMat.clone();
          materials.push(mat);
          mat.transparent = true;
          mat.opacity = 0.70;
          mat.depthWrite = false;

          if (mat.color) {
            if (isValid) {
              mat.color.lerp(tintColor, 0.20);
            } else {
              mat.color.lerp(tintColor, 0.65);
            }
          }
          mesh.material = mat;
        }
      }
    });
    return { coloredGhostScene: cloned, ghostMaterials: materials };
  }, [ghostScene, isValid]);

  useEffect(() => {
    return () => {
      ghostMaterials.forEach((m) => m.dispose());
    };
  }, [ghostMaterials]);

  return <primitive object={coloredGhostScene} />;
}

export function GridPlane() {
  const { language } = useTranslation();
  const selectedTool = useGameStore((state) => state.selectedTool);
  const setSelectedTool = useGameStore((state) => state.setSelectedTool);
  const selectedCatalogItem = useGameStore((state) => state.selectedCatalogItem);
  const setSelectedCatalogItem = useGameStore((state) => state.setSelectedCatalogItem);
  const hoveredTile = useGameStore((state) => state.hoveredGridTile);
  const setHoveredTile = useGameStore((state) => state.setHoveredGridTile);
  const placeCatalogItem = useGameStore((state) => state.placeCatalogItem);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const unlockedSignature = useGameStore((state) =>
    getUnlockedTilesSignature(state.saveData.world, state.saveData.world_objects)
  );
  const ledger = useGameStore((state) => state.saveData.currency_ledger);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const sealedTiles = useGameStore((state) => state.saveData.world.sealed_tiles) || EMPTY_SEALED_TILES;
  const threatenedTile = useGameStore((state) => state.saveData.world.bulldozer?.threatened_tile || null);

  const isGridVisible = useGameStore((state) => state.isGridVisible);
  const toggleGrid = useGameStore((state) => state.toggleGrid);
  const isExpandLandMode = useGameStore((state) => state.isExpandLandMode);
  const setIsExpandLandMode = useGameStore((state) => state.setIsExpandLandMode);
  const unlockLandTile = useGameStore((state) => state.unlockLandTile);

  const placementRotation = useGameStore((state) => state.placementRotation);
  const rotatePlacement = useGameStore((state) => state.rotatePlacement);
  const relocatingObjectId = useGameStore((state) => state.relocatingObjectId);
  const confirmRelocation = useGameStore((state) => state.confirmRelocation);
  const cancelRelocation = useGameStore((state) => state.cancelRelocation);

  const tileSize = GAME_CONFIG.grid.tileSize;
  const gridSize = GAME_CONFIG.grid.size;

  const isRelocating = Boolean(relocatingObjectId);
  const isBuildActive = Boolean(selectedTool || selectedCatalogItem);
  const isInteractingWithGrid = isBuildActive || isRelocating || isExpandLandMode;

  // Clear hovered tile when leaving grid interaction modes
  useEffect(() => {
    if (!isInteractingWithGrid) {
      setHoveredTile(null);
    }
  }, [isInteractingWithGrid, setHoveredTile]);

  const unlockedSet = useMemo(() => {
    const state = useGameStore.getState();
    return getUnlockedTilesSet(state.saveData.world, state.saveData.world_objects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedSignature]);

  const expandableTiles = useMemo(() => {
    return getExpandableTiles(unlockedSet);
  }, [unlockedSet]);

  const relocatingObject = useMemo(() => {
    if (!relocatingObjectId) return null;
    return worldObjects.find((o) => o.id === relocatingObjectId) || null;
  }, [relocatingObjectId, worldObjects]);

  // Handle keyboard shortcuts (R to rotate, G to toggle grid, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (isInteractingWithGrid) {
          e.preventDefault();
          rotatePlacement();
          soundManager.playPop();
        }
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        toggleGrid();
        soundManager.playPop();
      } else if (e.key === 'Escape') {
        if (isRelocating) {
          e.preventDefault();
          cancelRelocation();
        } else if (isBuildActive) {
          e.preventDefault();
          setSelectedCatalogItem(null);
          setSelectedTool(null);
        } else if (isExpandLandMode) {
          e.preventDefault();
          setIsExpandLandMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isInteractingWithGrid,
    isRelocating,
    isBuildActive,
    isExpandLandMode,
    rotatePlacement,
    cancelRelocation,
    toggleGrid,
    setIsExpandLandMode,
    setSelectedCatalogItem,
    setSelectedTool,
  ]);

  // Procedural Architectural White Blueprint Grid Geometry
  const architecturalGridGeo = useMemo(() => {
    const points: number[] = [];
    const segmentsPerLine = 30;
    const half = (gridSize * tileSize) / 2; // 5.0
    const step = (gridSize * tileSize) / segmentsPerLine;

    // Horizontal grid lines along X
    for (let i = 0; i <= gridSize; i++) {
      const z = -half + i * tileSize;
      for (let s = 0; s < segmentsPerLine; s++) {
        const x1 = -half + s * step;
        const x2 = -half + (s + 1) * step;
        const y1 = getTerrainElevation(x1, z).height + 0.009;
        const y2 = getTerrainElevation(x2, z).height + 0.009;
        points.push(x1, y1, z, x2, y2, z);
      }
    }

    // Vertical grid lines along Z
    for (let i = 0; i <= gridSize; i++) {
      const x = -half + i * tileSize;
      for (let s = 0; s < segmentsPerLine; s++) {
        const z1 = -half + s * step;
        const z2 = -half + (s + 1) * step;
        const y1 = getTerrainElevation(x, z1).height + 0.009;
        const y2 = getTerrainElevation(x, z2).height + 0.009;
        points.push(x, y1, z1, x, y2, z2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [gridSize, tileSize]);

  useEffect(() => {
    return () => {
      architecturalGridGeo.dispose();
    };
  }, [architecturalGridGeo]);

  // Determine if hovered tile is valid to place or relocate
  const placementStatus = useMemo(() => {
    if (!hoveredTile) return null;

    const isUnlocked = isTileUnlocked(hoveredTile.grid_x, hoveredTile.grid_y, unlockedSet);
    const isExpandable = canUnlockTile(hoveredTile.grid_x, hoveredTile.grid_y, unlockedSet);
    const isSealed = sealedTiles.includes(`${hoveredTile.grid_x},${hoveredTile.grid_y}`);
    const dynamicExpandCost = getLandExpansionZoneInfo(unlockedSet.size).nextTileCost;

    if (isExpandLandMode) {
      const affordable = canAfford(ledger, dynamicExpandCost);
      return {
        isValid: isExpandable && affordable,
        isOccupied: false,
        isAffordable: affordable,
        cost: dynamicExpandCost,
        isUnlocked: false,
        isExpandable,
        isSealed,
      };
    }

    if (isRelocating) {
      const otherObjects = worldObjects.filter((o) => o.id !== relocatingObjectId);
      const occupied = isTileOccupied(hoveredTile.grid_x, hoveredTile.grid_y, otherObjects);
      return {
        isValid: !occupied && isUnlocked && !isSealed,
        isOccupied: occupied,
        isAffordable: true,
        cost: 0,
        isUnlocked,
        isExpandable,
        isSealed,
      };
    }

    if (isBuildActive) {
      const existingObj = worldObjects.find(
        (o) => o.grid_x === hoveredTile.grid_x && o.grid_y === hoveredTile.grid_y && o.status !== 'marked_for_clearing'
      );
      const isBridge = selectedCatalogItem
        ? selectedCatalogItem.id.toLowerCase().includes('bridge') || selectedCatalogItem.model.toLowerCase().includes('bridge')
        : false;
      const isRiverOnTile = Boolean(
        existingObj &&
        ((existingObj.model_variant || '').toLowerCase().includes('river') || (existingObj.id || '').toLowerCase().includes('river'))
      );

      const occupied = existingObj ? !(isBridge && isRiverOnTile) : false;
      const cost = selectedCatalogItem
        ? selectedCatalogItem.cost
        : selectedTool
        ? GAME_CONFIG.costs[selectedTool]
        : 0;
      const affordable = canAfford(ledger, cost);

      return {
        isValid: !occupied && affordable && isUnlocked && !isSealed,
        isOccupied: occupied,
        isAffordable: affordable,
        cost,
        isUnlocked,
        isExpandable,
        isSealed,
      };
    }

    return {
      isValid: !isSealed,
      isOccupied: isTileOccupied(hoveredTile.grid_x, hoveredTile.grid_y, worldObjects),
      isAffordable: true,
      cost: 0,
      isUnlocked,
      isExpandable,
      isSealed,
    };
  }, [
    hoveredTile,
    isExpandLandMode,
    isRelocating,
    isBuildActive,
    unlockedSet,
    sealedTiles,
    relocatingObjectId,
    worldObjects,
    selectedCatalogItem,
    selectedTool,
    ledger,
  ]);

  // Resolve ghost model path using asset manifest
  const ghostModelPath = useMemo(() => {
    if (isRelocating && relocatingObject) {
      const item = getManifestItem(relocatingObject.model_variant);
      if (item) return item.modelPath;
      if (relocatingObject.object_type === 'tree') return '/models/kenney_nature_kit_tree_oak.glb';
      if (relocatingObject.object_type === 'rock') return '/models/fabz_rounded_rock.glb';
      return '/models/kenney_nature_kit_path_stone.glb';
    }

    if (selectedCatalogItem) {
      const item =
        getManifestItem(selectedCatalogItem.id) || getManifestItem(selectedCatalogItem.model);
      if (item) return item.modelPath;
    }

    if (selectedTool === 'tree') return '/models/kenney_nature_kit_tree_oak.glb';
    if (selectedTool === 'rock') return '/models/fabz_rounded_rock.glb';
    return '/models/kenney_nature_kit_path_stone.glb';
  }, [isRelocating, relocatingObject, selectedCatalogItem, selectedTool]);

  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTappedTileRef = useRef<string>('');
  const lastExpandTimeRef = useRef<number>(0);

  const handleExpandTile = (grid_x: number, grid_y: number) => {
    const now = Date.now();
    if (now - lastExpandTimeRef.current < 750) return;
    lastExpandTimeRef.current = now;

    if (unlockedSet.has(`${grid_x},${grid_y}`)) {
      useGameStore
        .getState()
        .notify(
          language === 'en'
            ? 'This tile is already part of your sanctuary. Tap a glowing edge tile to expand.'
            : 'Petak ini sudah menjadi bagian dari suakamu. Ketuk petak bercahaya di tepi pulau untuk memperluas.',
          'info'
        );
      return;
    }

    const isExpandable = canUnlockTile(grid_x, grid_y, unlockedSet);
    if (isExpandable) {
      const ok = unlockLandTile(grid_x, grid_y);
      if (ok) soundManager.playLevelUp();
    } else {
      useGameStore
        .getState()
        .notify(
          language === 'en'
            ? 'Only tiles directly connected to your sanctuary island can be unlocked!'
            : 'Hanya petak yang menempel langsung dengan pulau yang dapat dibuka!',
          'error'
        );
    }
  };

  const applyGridTap = (point: THREE.Vector3) => {
    const target = worldToGrid(point.x, point.z);
    if (!target) return;

    const tileKey = `${target.grid_x},${target.grid_y}`;
    const now = Date.now();
    // Debounce duplicate rapid events within 180ms
    if (now - lastTapTimeRef.current < 180 && lastTappedTileRef.current === tileKey) {
      return;
    }
    lastTapTimeRef.current = now;
    lastTappedTileRef.current = tileKey;

    if (isExpandLandMode) {
      handleExpandTile(target.grid_x, target.grid_y);
      return;
    }

    if (isBuildActive || isRelocating) {
      setHoveredTile(target);
      soundManager.playPop();
      hapticLight();
    }
  };

  const handlePointerDown = (e: { nativeEvent?: MouseEvent | TouchEvent | PointerEvent; point: THREE.Vector3 }) => {
    if (!isInteractingWithGrid) return;
    const clientX = e.nativeEvent && 'clientX' in e.nativeEvent ? e.nativeEvent.clientX : 0;
    const clientY = e.nativeEvent && 'clientY' in e.nativeEvent ? e.nativeEvent.clientY : 0;
    pointerDownPosRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: { nativeEvent?: MouseEvent | TouchEvent | PointerEvent; point: THREE.Vector3; stopPropagation: () => void }) => {
    if (!isInteractingWithGrid) return;
    if (pointerDownPosRef.current) {
      const clientX = e.nativeEvent && 'clientX' in e.nativeEvent ? e.nativeEvent.clientX : 0;
      const clientY = e.nativeEvent && 'clientY' in e.nativeEvent ? e.nativeEvent.clientY : 0;
      const dist = Math.hypot(clientX - pointerDownPosRef.current.x, clientY - pointerDownPosRef.current.y);
      const elapsed = Date.now() - pointerDownPosRef.current.time;
      pointerDownPosRef.current = null;
      // Tap gesture threshold (movement < 28px, duration < 650ms)
      if (dist < 28 && elapsed < 650) {
        e.stopPropagation();
        applyGridTap(e.point);
      }
    }
  };

  const handleClick = (e: { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (!isInteractingWithGrid) return;
    e.stopPropagation();
    applyGridTap(e.point);
  };

  const ghostWorldPos = hoveredTile
    ? gridToWorld(hoveredTile.grid_x, hoveredTile.grid_y, 0.06)
    : null;

  return (
    <group>
      {/* 1. Architectural Blueprint White Grid (Shown during Perluas Lahan mode or when explicitly toggled) */}
      {(isGridVisible || isExpandLandMode) && (
        <lineSegments geometry={architecturalGridGeo}>
          <lineBasicMaterial
            color={timeOfDay === 'night' ? '#A7F3D0' : '#FFFFFF'}
            transparent
            opacity={timeOfDay === 'night' ? 0.22 : 0.16}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 1b. Bulldozer Threatened & Sealed Tile 3D Territorial Markers */}
      {threatenedTile && (() => {
        const [tx, ty] = threatenedTile.split(',').map(Number);
        if (isNaN(tx) || isNaN(ty)) return null;
        const pos = gridToWorld(tx, ty, 0.014);
        return (
          <group position={pos}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[tileSize * 0.92, tileSize * 0.92]} />
              <meshBasicMaterial color="#F59E0B" transparent opacity={0.32} depthWrite={false} />
            </mesh>
          </group>
        );
      })()}
      {sealedTiles.map((coord) => {
        const [sx, sy] = coord.split(',').map(Number);
        if (isNaN(sx) || isNaN(sy)) return null;
        const pos = gridToWorld(sx, sy, 0.016);
        return (
          <group key={`seal_${coord}`} position={pos}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[tileSize * 0.94, tileSize * 0.94]} />
              <meshBasicMaterial color="#F43F5E" transparent opacity={0.38} depthWrite={false} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Visual Blueprint Slots for Expandable Locked Tiles (ONLY visible in Perluas Lahan mode) */}
      {isExpandLandMode && (
        <group>
          {expandableTiles.map((tile) => {
            const worldPos = gridToWorld(tile.grid_x, tile.grid_y, 0.008);
            const isHovered = hoveredTile?.grid_x === tile.grid_x && hoveredTile?.grid_y === tile.grid_y;
            return (
              <group key={`exp_${tile.grid_x}_${tile.grid_y}`} position={worldPos}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[tileSize * 0.94, tileSize * 0.94]} />
                  <meshBasicMaterial
                    color={isHovered ? '#10B981' : timeOfDay === 'night' ? '#059669' : '#34D399'}
                    transparent
                    opacity={isHovered ? 0.65 : 0.38}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 3. Invisible raycast plane covering the logical 10x10 garden (only active during grid interaction) */}
      {isInteractingWithGrid && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
        >
          <planeGeometry args={[gridSize * tileSize, gridSize * tileSize]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* 4. Active Ghost & Placement Indicators */}
      {(isBuildActive || isRelocating) && (
        <>
          {/* Glowing Ground Indicator Plate & Crisp Border */}
          {ghostWorldPos && hoveredTile && (
            <group position={[ghostWorldPos[0], ghostWorldPos[1] + 0.015, ghostWorldPos[2]]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[tileSize * 0.96, tileSize * 0.96]} />
                <meshBasicMaterial
                  color={placementStatus?.isValid ? '#10B981' : '#F43F5E'}
                  transparent
                  opacity={0.35}
                  depthWrite={false}
                />
              </mesh>
            </group>
          )}

          {/* 3D Ghost Object Preview at 70% Opacity with Interactive Rotation */}
          {ghostWorldPos && (
            <group
              position={ghostWorldPos}
              rotation={[0, placementRotation, 0]}
              scale={
                isRelocating && relocatingObject?.scale
                  ? [relocatingObject.scale, relocatingObject.scale, relocatingObject.scale]
                  : [1.15, 1.15, 1.15]
              }
            >
              <React.Suspense fallback={null}>
                <GhostObjectMesh
                  modelPath={ghostModelPath}
                  isValid={placementStatus?.isValid ?? true}
                />
              </React.Suspense>
            </group>
          )}
        </>
      )}

      {/* 5. Land Expansion Hover Plate (ONLY when isExpandLandMode is actively true) */}
      {isExpandLandMode && hoveredTile && canUnlockTile(hoveredTile.grid_x, hoveredTile.grid_y, unlockedSet) && (
        <group position={gridToWorld(hoveredTile.grid_x, hoveredTile.grid_y, 0.018)}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tileSize * 0.96, tileSize * 0.96]} />
            <meshBasicMaterial
              color="#10B981"
              transparent
              opacity={0.38}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
