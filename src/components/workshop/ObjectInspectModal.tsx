"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/lib/game/useGameStore";
import { BUILD_CATALOG, GAME_CONFIG } from "@/lib/game/config";
import { getManifestItem } from "@/lib/game/assetManifest";
import { soundManager } from "@/lib/audio/sounds";
import { getObjectBaseCost } from "@/lib/game/economy";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import {
  Sparkles,
  X,
  ShieldAlert,
  CheckCircle2,
  Trees,
  Mountain,
  Footprints,
  AlertTriangle,
  Play,
  Truck,
  Trash2,
  Move,
} from "lucide-react";

export function ObjectInspectModal() {
  const selectedObject = useGameStore((state) => state.selectedObject);
  const setSelectedObject = useGameStore((state) => state.setSelectedObject);
  const restoreReclaimedObject = useGameStore(
    (state) => state.restoreReclaimedObject,
  );
  const bribeBulldozerCrew = useGameStore((state) => state.bribeBulldozerCrew);
  const startRelocatingObject = useGameStore(
    (state) => state.startRelocatingObject,
  );
  const removeObject = useGameStore((state) => state.removeObject);
  const startFocus = useGameStore((state) => state.startFocus);
  const activeSession = useGameStore((state) => state.activeSession);
  const notify = useGameStore((state) => state.notify);
  const gold = useGameStore((state) => state.saveData.profile.goldCached);

  useEffect(() => {
    if (!selectedObject) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedObject(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObject, setSelectedObject]);

  if (!selectedObject) return null;

  const isBulldozer = selectedObject.id === "obj_bulldozer";
  const isMarkedForClearing = selectedObject.status === "marked_for_clearing";
  const isReclaimed = selectedObject.status === "reclaimed";

  const bribeCost = GAME_CONFIG.reclamation.bulldozer_mark_cost;
  const restoreCost = GAME_CONFIG.restore;
  const canAffordBribe = gold >= bribeCost;
  const canAffordRestore = gold >= restoreCost;

  const baseCost = getObjectBaseCost(selectedObject);
  const refundAmount = Math.max(1, Math.floor(baseCost * 0.5));

  const manifestItem = getManifestItem(selectedObject.model_variant);
  const catalogItem = BUILD_CATALOG.find(
    (c) => c.model === selectedObject.model_variant,
  );
  const displayName = isBulldozer
    ? "Bulldozer Konstruksi"
    : manifestItem?.name || catalogItem?.name || selectedObject.object_type;

  const handleRestore = () => {
    hapticMedium();
    const success = restoreReclaimedObject(selectedObject.id);
    if (success) {
      soundManager.playRestore();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5 },
          colors: ["#1e5638", "#fcd34d", "#34d399"],
        });
      } catch {}
    }
  };

  const handleBribe = () => {
    hapticMedium();
    const success = bribeBulldozerCrew();
    if (success) {
      soundManager.playRestore();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.5 },
          colors: ["#f59e0b", "#10b981", "#3b82f6"],
        });
      } catch {}
      setSelectedObject(null);
    }
  };

  const handleFocusToSave = () => {
    hapticLight();
    if (!activeSession || activeSession.status !== "active") {
      startFocus();
      notify(
        "Sesi fokus dimulai! Selesaikan sesi ini untuk mengusir kru konstruksi dan menyelamatkan pohonmu.",
        "info",
      );
    } else {
      notify(
        "Kamu sedang dalam sesi fokus! Selesaikan sesi ini untuk mengusir kru konstruksi.",
        "info",
      );
    }
    setSelectedObject(null);
  };

  const handleStartRelocate = () => {
    hapticLight();
    startRelocatingObject(selectedObject.id);
  };

  const handleRemove = () => {
    hapticMedium();
    const success = removeObject(selectedObject.id);
    if (success) {
      soundManager.playPop();
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.5 },
          colors: ["#f59e0b", "#ef4444", "#10b981"],
        });
      } catch {}
    }
  };

  const getIcon = () => {
    if (isBulldozer) {
      return <Truck className="w-4 h-4 text-amber-600" />;
    }
    switch (selectedObject.object_type) {
      case "tree":
        return <Trees className="w-4 h-4 text-[#1e5638]" />;
      case "rock":
        return <Mountain className="w-4 h-4 text-[#456b57]" />;
      case "path":
        return <Footprints className="w-4 h-4 text-amber-700" />;
      default:
        return <Trees className="w-4 h-4 text-[#1e5638]" />;
    }
  };

  return (
    <div
      className="fixed top-20 right-3.5 sm:right-6 z-30 pointer-events-auto max-w-[310px] w-[calc(100vw-28px)] animate-in fade-in zoom-in-95 duration-200"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        className="p-4 rounded-[28px] border border-white/85 shadow-[0_20px_48px_rgba(20,53,37,0.18)] text-[#143525]"
        style={{
          background:
            "linear-gradient(180deg, rgba(239, 246, 241, 0.96) 0%, rgba(226, 238, 230, 0.94) 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#143525]/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#bfdac8]/50 border border-white/80 shadow-2xs">
              {getIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold capitalize truncate tracking-tight text-[#143525]">
                {displayName}
              </h3>
              <p className="text-[10px] text-[#456b57] truncate">
                {isBulldozer
                  ? "Ancaman Inaktivitas"
                  : `Petak Lahan (${selectedObject.grid_x}, ${selectedObject.grid_y})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedObject(null)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs shrink-0"
            aria-label="Tutup inspeksi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="pt-3 space-y-2.5">
          {/* Memori Fokus Card */}
          {!isBulldozer &&
            (selectedObject.object_type === "tree" ||
              selectedObject.task_note) && (
              <div className="p-3 rounded-[20px] border border-white/85 bg-white/75 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-[#1e5638] flex items-center gap-1">
                    <span>🌱</span> Memori Fokus
                  </span>
                  <div className="flex items-center gap-1">
                    {selectedObject.focus_tag && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#bfdac8]/40 border border-[#bfdac8]/60 text-[#143525]">
                        {selectedObject.focus_tag}
                      </span>
                    )}
                    {selectedObject.focus_duration && (
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-black/5 text-[#456b57]">
                        {selectedObject.focus_duration}m
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs font-normal leading-relaxed text-[#143525]">
                  {selectedObject.task_note
                    ? `“${selectedObject.task_note}”`
                    : "Ditanam dari sesi fokus hening di pulau Rimba."}
                </p>

                <div className="text-[10px] flex items-center justify-between pt-1 border-t border-[#143525]/8 text-[#456b57]">
                  <span>Ditanam pada</span>
                  <span className="font-semibold text-[#143525]">
                    {new Date(selectedObject.created_at).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>
            )}

          {/* STATE 1: BULLDOZER THREAT DIRECT INSPECTION */}
          {isBulldozer ? (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-[20px] border border-amber-200/80 bg-amber-50/80 shadow-2xs text-[#143525]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-xs text-[#143525] tracking-tight">
                    Kru Konstruksi di Pulau
                  </p>
                  <p className="text-[10px] leading-relaxed text-[#456b57]">
                    Bulldozer akan menebang 1 pohon jika tidak ada aktivitas
                    selama 24 jam. Selesaikan sesi fokus atau halau dengan Soul.
                  </p>
                </div>
              </div>

              <div className="text-[11px] flex justify-between px-1 text-[#456b57]">
                <span>Energi Penghalau:</span>
                <span className="font-semibold text-amber-800 flex items-center gap-1">
                  {bribeCost} Soul{" "}
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleFocusToSave}
                  className="py-2.5 px-3 rounded-full text-xs font-semibold bg-[#1e5638] hover:bg-[#16442e] text-white active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Fokus (Gratis)</span>
                </button>

                <button
                  type="button"
                  onClick={handleBribe}
                  disabled={!canAffordBribe}
                  className={`py-2.5 px-3 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    canAffordBribe
                      ? "bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 active:scale-95 shadow-2xs"
                      : "bg-black/5 border-black/10 text-[#456b57]/40 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-current" />
                  <span>
                    {canAffordBribe
                      ? `Halau (${bribeCost})`
                      : `Butuh ${bribeCost}`}
                  </span>
                </button>
              </div>
            </div>
          ) : isMarkedForClearing ? (
            /* STATE 2: MARKED TREE FOR CLEARING */
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-[20px] border border-amber-200/80 bg-amber-50/80 shadow-2xs text-[#143525]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-xs text-[#143525] tracking-tight">
                    Ditandai untuk Ditebang
                  </p>
                  <p className="text-[10px] leading-relaxed text-[#456b57]">
                    Kru konstruksi menandai pohon ini. Selesaikan 1 Sesi Fokus
                    untuk menyelamatkannya atau halau dengan 40 Soul.
                  </p>
                </div>
              </div>

              <div className="text-[11px] flex justify-between px-1 text-[#456b57]">
                <span>Energi Penyelamatan:</span>
                <span className="font-semibold text-amber-800 flex items-center gap-1">
                  {bribeCost} Soul{" "}
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleFocusToSave}
                  className="py-2.5 px-3 rounded-full text-xs font-semibold bg-[#1e5638] hover:bg-[#16442e] text-white active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Fokus</span>
                </button>

                <button
                  type="button"
                  onClick={handleBribe}
                  disabled={!canAffordBribe}
                  className={`py-2.5 px-3 rounded-full text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    canAffordBribe
                      ? "bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 active:scale-95 shadow-2xs"
                      : "bg-black/5 border-black/10 text-[#456b57]/40 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-current" />
                  <span>
                    {canAffordBribe
                      ? `Halau (${bribeCost})`
                      : `Butuh ${bribeCost}`}
                  </span>
                </button>
              </div>
            </div>
          ) : isReclaimed ? (
            /* STATE 3: RECLAIMED MOSS (RESTORE) */
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-[20px] border border-amber-200/80 bg-amber-50/80 shadow-2xs text-[#143525]">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-xs text-[#143525] tracking-tight">
                    Tertutup Lumut Liar
                  </p>
                  <p className="text-[10px] leading-relaxed text-[#456b57]">
                    Pulihkan objek ini untuk mengembalikan kesegaran alaminya.
                  </p>
                </div>
              </div>

              <div className="text-[11px] flex justify-between px-1 text-[#456b57]">
                <span>Energi Pemulihan:</span>
                <span className="font-semibold text-amber-800 flex items-center gap-1">
                  {restoreCost} Soul{" "}
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                </span>
              </div>

              <button
                type="button"
                onClick={handleRestore}
                disabled={!canAffordRestore}
                className={`w-full py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  canAffordRestore
                    ? "bg-[#1e5638] hover:bg-[#16442e] text-white active:scale-95 shadow-xs"
                    : "bg-black/5 border border-black/10 text-[#456b57]/40 cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {canAffordRestore
                    ? `Pulihkan (${restoreCost} Soul)`
                    : `Butuh ${restoreCost} Soul`}
                </span>
              </button>
            </div>
          ) : (
            /* STATE 4: HEALTHY & FLOURISHING */
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-2.5 rounded-[18px] border border-white/85 bg-white/75 text-[#143525] shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[#1e5638] shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-[#143525]">
                    Subur & Terawat
                  </p>
                  <p className="text-[10px] text-[#456b57]">
                    Tumbuh dari ketekunan fokusmu di Rimba.
                  </p>
                </div>
              </div>

              {catalogItem?.description && (
                <p className="text-[11px] italic text-[#456b57] px-1 pt-0.5 leading-relaxed">
                  &ldquo;{catalogItem.description}&rdquo;
                </p>
              )}

              {/* Land Management Controls */}
              {!activeSession && (
                <div className="pt-2 border-t border-[#143525]/10 space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#2f5542]/75 px-1">
                    Tata Letak & Lahan
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleStartRelocate}
                      className="py-2 px-3 rounded-full text-xs font-semibold border border-white/90 bg-white/80 hover:bg-white text-[#143525] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title="Pindahkan objek ke petak lain"
                    >
                      <Move className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Pindahkan</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemove}
                      className="py-2 px-3 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title={`Hapus objek dan dapatkan kembali 50% Soul (+${refundAmount} Soul)`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus (+{refundAmount})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
