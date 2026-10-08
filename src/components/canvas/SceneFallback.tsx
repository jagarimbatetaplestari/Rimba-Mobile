import React from 'react';
import { useGameStore } from '@/lib/game/useGameStore';
import { ObjectType } from '@/types/game';
import { canAfford } from '@/lib/game/economy';
import { GAME_CONFIG } from '@/lib/game/config';

export function SceneFallback() {
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const selectedTool = useGameStore((state) => state.selectedTool);
  const selectedObject = useGameStore((state) => state.selectedObject);
  const setSelectedObject = useGameStore((state) => state.setSelectedObject);
  const placeObject = useGameStore((state) => state.placeObject);
  const ledger = useGameStore((state) => state.saveData.currency_ledger);

  const gridSize = GAME_CONFIG.grid.size;

  const handleTileClick = (x: number, y: number) => {
    const existing = worldObjects.find((o) => o.grid_x === x && o.grid_y === y);
    if (existing) {
      setSelectedObject(existing);
      return;
    }

    if (selectedTool) {
      placeObject(selectedTool, x, y);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#E6F3EA] to-[#D5E8DD]">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-emerald-800/80">
          2D Garden View (Fallback Mode)
        </h3>
        <p className="text-xs text-emerald-700/60">
          WebGL preview is in resilient 2D mode. All gameplay and persistence are fully active.
        </p>
      </div>

      <div className="grid grid-cols-10 gap-1 p-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg">
        {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
          const x = idx % gridSize;
          const y = Math.floor(idx / gridSize);
          const obj = worldObjects.find((o) => o.grid_x === x && o.grid_y === y);

          const isSelected = selectedObject?.id === obj?.id;
          const isReclaimed = obj?.status === 'reclaimed';

          return (
            <button
              key={`${x}-${y}`}
              onClick={() => handleTileClick(x, y)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all relative ${
                obj
                  ? isReclaimed
                    ? 'bg-amber-700/60 text-white shadow-inner'
                    : 'bg-emerald-600/80 text-white shadow'
                  : 'bg-emerald-100/50 hover:bg-emerald-200/60 border border-emerald-200/40'
              } ${isSelected ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
            >
              {obj ? (
                obj.object_type === 'tree' ? '🌲' : obj.object_type === 'rock' ? '🪨' : '🧱'
              ) : selectedTool ? (
                <span className="text-[10px] opacity-40">+</span>
              ) : null}

              {isReclaimed && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
