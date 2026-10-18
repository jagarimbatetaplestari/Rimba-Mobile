"use client";

import React, { useState } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { useEntitlements } from "@/lib/subscription/useEntitlements";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { BIOME_CATALOG } from "@/lib/game/config";
import { BiomeType, IslandSlot } from "@/types/game";
import {
  X,
  Plus,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  Palmtree,
  Lock,
} from "lucide-react";

interface IslandSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IslandSwitcherModal({ isOpen, onClose }: IslandSwitcherModalProps) {
  const { t, language } = useTranslation();
  const isEn = language === "en";

  const saveData = useGameStore((state) => state.saveData);
  const activeIslandId = saveData.active_island_id || "island_default";
  const islands = saveData.islands || [];
  const switchIsland = useGameStore((state) => state.switchIsland);
  const createNewIsland = useGameStore((state) => state.createNewIsland);
  const renameIsland = useGameStore((state) => state.renameIsland);
  const deleteIsland = useGameStore((state) => state.deleteIsland);

  const { isPro, maxIslands, canCreateNewIsland, triggerPaywall } = useEntitlements();

  const [isCreating, setIsCreating] = useState(false);
  const [newIslandName, setNewIslandName] = useState("");
  const [selectedBiome, setSelectedBiome] = useState<BiomeType>("meadow");

  const [editingIslandId, setEditingIslandId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  if (!isOpen) return null;

  const handleSelectIsland = (islandId: string) => {
    if (islandId === activeIslandId) {
      onClose();
      return;
    }
    soundManager.playPop();
    hapticMedium();
    const ok = switchIsland(islandId);
    if (ok) {
      onClose();
    }
  };

  const handleStartCreate = () => {
    soundManager.playPop();
    hapticLight();
    if (!canCreateNewIsland) {
      onClose();
      triggerPaywall("multi_island_limit");
      return;
    }
    setNewIslandName(`${isEn ? "Sanctuary" : "Suaka"} ${islands.length + 1}`);
    setSelectedBiome("meadow");
    setIsCreating(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newIslandName.trim();
    if (!name) return;

    soundManager.playComplete();
    hapticSuccess();
    const ok = createNewIsland(name, selectedBiome);
    if (ok) {
      setIsCreating(false);
      onClose();
    }
  };

  const handleStartRename = (isl: IslandSlot) => {
    soundManager.playPop();
    hapticLight();
    setEditingIslandId(isl.id);
    setEditingName(isl.name);
  };

  const handleConfirmRename = (islandId: string) => {
    soundManager.playPop();
    hapticLight();
    if (editingName.trim()) {
      renameIsland(islandId, editingName.trim());
    }
    setEditingIslandId(null);
  };

  const handleDelete = (isl: IslandSlot) => {
    soundManager.playPop();
    hapticLight();
    const confirmMsg = t.islandsModal.deleteConfirm.replace("{name}", isl.name);
    if (typeof window !== "undefined" && window.confirm(confirmMsg)) {
      deleteIsland(isl.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      style={{
        fontFamily:
          "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[32px] p-5 bg-[#FAFAF7] border border-[#0D3528]/10 text-[#0D3528] flex flex-col gap-4 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between relative z-10 pb-1 border-b border-[#0D3528]/8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center shadow-xs">
              <Palmtree className="w-4 h-4 text-[#187557] stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-[#0D3528]">
                {t.islandsModal.title}
              </h2>
              <p className="text-[11px] text-[#4C7567]">
                {t.islandsModal.capacity
                  .replace("{current}", String(islands.length))
                  .replace("{max}", String(maxIslands))}
                {isPro && (
                  <span className="ml-1 text-amber-700 font-semibold">
                    (Pro ✨)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 border border-[#0D3528]/10 flex items-center justify-center text-[#0D3528] transition-all cursor-pointer shadow-xs active:scale-90"
            aria-label={t.common.close}
          >
            <X className="w-3.5 h-3.5 stroke-[2.4]" />
          </button>
        </div>

        {/* List of Islands */}
        {!isCreating ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar relative z-10 py-0.5">
            {islands.map((isl) => {
              const isActive = isl.id === activeIslandId;
              const isEditing = editingIslandId === isl.id;
              const currentBiome = isActive ? saveData.active_biome || isl.biome : isl.biome;
              const biomeCfg = BIOME_CATALOG.find((b) => b.id === currentBiome);
              const objectsToCount = isActive ? saveData.world_objects : isl.world_objects;
              const treeCount = objectsToCount?.filter((o) => o.object_type === "tree")?.length || 0;

              return (
                <div
                  key={isl.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    isActive
                      ? "bg-white text-[#0D3528] border-[#187557]/40 shadow-xs ring-1 ring-[#187557]/20"
                      : "bg-white/80 hover:bg-white text-[#0D3528] border-[#0D3528]/10"
                  }`}
                >
                  {/* Left: Island Info / Edit form */}
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => !isEditing && handleSelectIsland(isl.id)}
                  >
                    <span className="text-2xl shrink-0 p-1 rounded-xl bg-[#0D3528]/5">
                      {biomeCfg?.icon || "🌱"}
                    </span>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmRename(isl.id);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 rounded-lg bg-white text-[#0D3528] text-xs font-semibold border border-[#187557] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmRename(isl.id)}
                            className="p-1 rounded-lg bg-[#187557] text-white shrink-0"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold truncate tracking-tight text-[#0D3528]">
                              {isl.name}
                            </span>
                            {isActive && (
                              <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-[#187557] text-white">
                                {t.islandsModal.active}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] truncate font-medium text-[#4C7567]">
                            {treeCount} {t.islandsModal.trees} • {biomeCfg?.name || "Meadow"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions (Rename, Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleStartRename(isl)}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer text-[#4C7567] hover:text-[#0D3528] hover:bg-[#0D3528]/5"
                        title={t.islandsModal.rename}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {islands.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(isl)}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title={t.islandsModal.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Create New Island Form */
          <form onSubmit={handleConfirmCreate} className="space-y-3 relative z-10 py-1">
            <div className="space-y-1">
              <label className="text-[11.5px] font-semibold text-[#4C7567]">
                {t.islandsModal.nameLabel}
              </label>
              <input
                type="text"
                value={newIslandName}
                onChange={(e) => setNewIslandName(e.target.value)}
                placeholder={t.islandsModal.namePlaceholder}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#0D3528]/15 text-[#0D3528] text-xs font-semibold placeholder:text-[#4C7567]/50 outline-none focus:border-[#187557]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[#4C7567]">
                {t.islandsModal.biomeLabel}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {BIOME_CATALOG.map((b) => {
                  const isSel = selectedBiome === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBiome(b.id)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                        isSel
                          ? "bg-[#E4F4ED] text-[#0D3528] border-[#187557] font-bold shadow-xs"
                          : "bg-white/80 hover:bg-white text-[#0D3528] border-[#0D3528]/10 font-medium"
                      }`}
                    >
                      <span className="text-lg">{b.icon}</span>
                      <span className="text-xs truncate">{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 py-2 rounded-xl bg-white hover:bg-[#FAFAF7] text-[#4C7567] font-semibold text-xs border border-[#0D3528]/10 cursor-pointer"
              >
                {t.islandsModal.cancelBtn}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {t.islandsModal.createBtn}
              </button>
            </div>
          </form>
        )}

        {/* Footer / Create New Button */}
        {!isCreating && (
          <div className="pt-1 relative z-10">
            {canCreateNewIsland ? (
              <button
                type="button"
                onClick={handleStartCreate}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-[#187557]/20"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.islandsModal.createNew}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  triggerPaywall("multi_island_capacity");
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>{t.islandsModal.unlockPro}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
