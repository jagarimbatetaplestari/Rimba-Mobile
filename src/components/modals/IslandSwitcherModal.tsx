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
  const { language } = useTranslation();
  const isEn = language === "en";

  const saveData = useGameStore((state) => state.saveData);
  const activeIslandId = saveData.active_island_id || "island_default";
  const islands = saveData.islands || [];
  const switchIsland = useGameStore((state) => state.switchIsland);
  const createNewIsland = useGameStore((state) => state.createNewIsland);
  const renameIsland = useGameStore((state) => state.renameIsland);
  const deleteIsland = useGameStore((state) => state.deleteIsland);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === "night";

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
    setNewIslandName(`Suaka ${islands.length + 1}`);
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
    const confirmMsg = isEn
      ? `Are you sure you want to delete "${isl.name}"? This action cannot be undone.`
      : `Yakin ingin menghapus pulau "${isl.name}"? Tindakan ini tidak dapat dibatalkan.`;
    if (typeof window !== "undefined" && window.confirm(confirmMsg)) {
      deleteIsland(isl.id);
    }
  };

  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(15, 34, 24, 0.72) 35%, rgba(8, 20, 14, 0.88) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(240, 248, 243, 0.25) 22%, rgba(20, 52, 35, 0.52) 100%)",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    boxShadow:
      "0 24px 48px -8px rgba(0, 0, 0, 0.28), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)",
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
        style={modalGlassStyle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[32px] p-5 text-white flex flex-col gap-4 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Specular sheen */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10 pb-1 border-b border-white/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shadow-xs">
              <Palmtree className="w-4 h-4 text-emerald-300 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-white drop-shadow-xs">
                {isEn ? "Sanctuary Islands" : "Daftar Pulau Suaka"}
              </h2>
              <p className="text-[11px] text-white/70">
                {isEn
                  ? `Capacity: ${islands.length}/${maxIslands} Slots`
                  : `Kapasitas: ${islands.length}/${maxIslands} Pulau`}
                {isPro && (
                  <span className="ml-1 text-amber-300 font-semibold">
                    (Pro ✨)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-90"
            aria-label="Close"
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
              const biomeCfg = BIOME_CATALOG.find((b) => b.id === isl.biome);
              const treeCount = isl.world_objects?.filter((o) => o.object_type === "tree")?.length || 0;

              return (
                <div
                  key={isl.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    isActive
                      ? "bg-white text-[#0b2719] border-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                      : "bg-white/10 hover:bg-white/15 text-white border-white/15"
                  }`}
                >
                  {/* Left: Island Info / Edit form */}
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => !isEditing && handleSelectIsland(isl.id)}
                  >
                    <span className="text-2xl shrink-0 p-1 rounded-xl bg-black/10">
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
                            className="w-full px-2 py-0.5 rounded-lg bg-black/10 text-current text-xs font-semibold border border-current/20 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmRename(isl.id)}
                            className="p-1 rounded-lg bg-emerald-500 text-white shrink-0"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[13px] font-bold truncate tracking-tight ${
                                isActive ? "text-[#0b2719]" : "text-white"
                              }`}
                            >
                              {isl.name}
                            </span>
                            {isActive && (
                              <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-[#0b2719] text-white">
                                {isEn ? "Active" : "Aktif"}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10.5px] truncate font-medium ${
                              isActive ? "text-[#0b2719]/70" : "text-white/70"
                            }`}
                          >
                            {treeCount} {isEn ? "trees" : "pohon"} • {biomeCfg?.name || "Meadow"}
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
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isActive
                            ? "hover:bg-black/10 text-[#0b2719]/70 hover:text-[#0b2719]"
                            : "hover:bg-white/15 text-white/70 hover:text-white"
                        }`}
                        title={isEn ? "Rename" : "Ganti Nama"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {islands.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(isl)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isActive
                              ? "hover:bg-rose-100 text-rose-700"
                              : "hover:bg-rose-500/20 text-rose-300"
                          }`}
                          title={isEn ? "Delete Island" : "Hapus Pulau"}
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
              <label className="text-[11.5px] font-semibold text-white/80">
                {isEn ? "Island Name" : "Nama Pulau"}
              </label>
              <input
                type="text"
                value={newIslandName}
                onChange={(e) => setNewIslandName(e.target.value)}
                placeholder={isEn ? "e.g. Work Sanctuary" : "cth: Suaka Kantor"}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-semibold placeholder:text-white/40 outline-none focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-white/80">
                {isEn ? "Starter Biome" : "Bioma Awal"}
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
                          ? "bg-white text-[#0b2719] border-white font-bold shadow-xs"
                          : "bg-white/10 hover:bg-white/15 text-white border-white/15 font-medium"
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
                className="flex-1 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 cursor-pointer"
              >
                {isEn ? "Cancel" : "Batal"}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-white hover:bg-white/90 text-[#0b2719] font-bold text-xs shadow-md cursor-pointer"
              >
                {isEn ? "Create Sanctuary" : "Buat Suaka"}
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
                className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{isEn ? "Create New Sanctuary" : "Tambah Pulau Baru"}</span>
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
                <span>
                  {isEn
                    ? "Unlock up to 5 Islands (Rimba Pro)"
                    : "Buka Hingga 5 Pulau (Rimba Pro)"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
