import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getLandFullState } from '../src/lib/game/worldRules';
import { useGameStore } from '../src/lib/game/useGameStore';
import { completeFocusSession } from '../src/lib/game/sessionRules';
import { WorldObject } from '../src/types/game';

function createMockTree(id: string, x: number, y: number): WorldObject {
  return {
    id,
    object_type: 'tree',
    grid_x: x,
    grid_y: y,
    rotation: 0,
    status: 'active',
    created_at: new Date().toISOString(),
    reclaimed_at: null,
  };
}

describe('LandFullState and Expand Land Guard', () => {
  let listeners: Record<string, ((e: any) => void)[]> = {};
  let storageItems: Map<string, string>;

  beforeEach(() => {
    listeners = {};
    storageItems = new Map<string, string>();
    const storage = {
      getItem: (key: string) => storageItems.get(key) ?? null,
      setItem: (key: string, value: string) => storageItems.set(key, value),
      removeItem: (key: string) => storageItems.delete(key),
      clear: () => storageItems.clear(),
    };
    vi.stubGlobal('localStorage', storage);

    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail?: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    };
    (globalThis as any).window = {
      localStorage: storage,
      addEventListener: (evt: string, cb: any) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(cb);
      },
      removeEventListener: (evt: string, cb: any) => {
        if (listeners[evt]) {
          listeners[evt] = listeners[evt].filter((fn) => fn !== cb);
        }
      },
      dispatchEvent: (evt: any) => {
        if (listeners[evt.type]) {
          listeners[evt.type].forEach((fn) => fn(evt));
        }
        return true;
      },
    };

    useGameStore.setState({
      activeSession: null,
      notification: null,
      isExpandLandMode: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).window;
    delete (globalThis as any).CustomEvent;
  });

  it('correctly calculates isFull and freeCount for starter 3x3 island', () => {
    const world = {
      id: 'world-1',
      name: 'Island',
      last_focus_completed_at: null,
      last_reclamation_at: null,
      unlocked_tiles: [
        '3,3', '3,4', '3,5',
        '4,3', '4,4', '4,5',
        '5,3', '5,4', '5,5',
      ],
    };

    // 8 objects -> 1 free tile
    const eightObjects: WorldObject[] = world.unlocked_tiles.slice(0, 8).map((coord, idx) => {
      const [grid_x, grid_y] = coord.split(',').map(Number);
      return createMockTree(`obj_${idx}`, grid_x, grid_y);
    });

    const stateNotFull = getLandFullState(world, eightObjects);
    expect(stateNotFull.isFull).toBe(false);
    expect(stateNotFull.unlockedCount).toBe(9);
    expect(stateNotFull.occupiedCount).toBe(8);
    expect(stateNotFull.freeCount).toBe(1);
    expect(stateNotFull.canExpand).toBe(true);

    // 9 objects -> full!
    const [lastX, lastY] = world.unlocked_tiles[8].split(',').map(Number);
    const nineObjects: WorldObject[] = [
      ...eightObjects,
      createMockTree('obj_8', lastX, lastY),
    ];

    const stateFull = getLandFullState(world, nineObjects);
    expect(stateFull.isFull).toBe(true);
    expect(stateFull.freeCount).toBe(0);
    expect(stateFull.occupiedCount).toBe(9);
    expect(stateFull.canExpand).toBe(true);
    expect(stateFull.nextExpansionCost?.gold).toBe(8);
  });

  it('blocks startFocus when island is full without noTree mode and emits rimba:land_full event', () => {
    const world = {
      id: 'world-1',
      name: 'Island',
      last_focus_completed_at: null,
      last_reclamation_at: null,
      unlocked_tiles: ['4,4'],
    };

    const oneObject: WorldObject[] = [createMockTree('obj_0', 4, 4)];

    useGameStore.setState((prev) => ({
      saveData: {
        ...prev.saveData,
        world,
        world_objects: oneObject,
      },
    }));

    const eventSpy = vi.fn();
    window.addEventListener('rimba:land_full', eventSpy);

    const started = useGameStore.getState().startFocus();
    expect(started).toBe(false);
    expect(useGameStore.getState().activeSession).toBeNull();
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener('rimba:land_full', eventSpy);
  });

  it('allows startFocus when noTree: true is explicitly requested on full island, granting rewards without a new tree', () => {
    const world = {
      id: 'world-1',
      name: 'Island',
      last_focus_completed_at: null,
      last_reclamation_at: null,
      unlocked_tiles: ['4,4'],
    };

    const oneObject: WorldObject[] = [createMockTree('obj_0', 4, 4)];

    useGameStore.setState((prev) => ({
      saveData: {
        ...prev.saveData,
        world,
        world_objects: oneObject,
      },
    }));

    // Start with noTree: true
    const started = useGameStore.getState().startFocus(300, 'Belajar', false, 'oak', undefined, undefined, true);
    expect(started).toBe(true);

    const session = useGameStore.getState().activeSession;
    expect(session).not.toBeNull();
    expect(session?.no_tree).toBe(true);
    expect(session?.target_tile).toBeUndefined();

    // Complete session with no_tree: true
    const completionResult = completeFocusSession(
      {
        ...session!,
        started_at: new Date(Date.now() - 305_000).toISOString(),
        expected_end_at: new Date(Date.now() - 5_000).toISOString(),
      },
      oneObject,
      new Set(world.unlocked_tiles)
    );

    expect(completionResult.success).toBe(true);
    expect(completionResult.rewardGold).toBeGreaterThan(0);
    expect(completionResult.rewardXp).toBeGreaterThan(0);
    expect(completionResult.newWorldObject).toBeUndefined(); // NO TREE CREATED
  });
});
