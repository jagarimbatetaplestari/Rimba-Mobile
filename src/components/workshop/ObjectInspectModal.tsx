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
  const isWithered = selectedObject.status === "withered" || selectedObject.model_variant === "nature_stump";

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
          colors: ["#187557", "#fcd34d", "#2BB688"],
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
          colors: ["#f59e0b", "#2BB688", "#187557"],
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
          colors: ["#f59e0b", "#ef4444", "#187557"],
        });
      } catch {}
    }
  };

  const getIcon = () => {
    if (isBulldozer) {
      return <Truck className="w-4 h-4 text-amber-600 stroke-[1.8]" />;
    }
    switch (selectedObject.object_type) {
      case "tree":
        return <Trees className="w-4 h-4 text-[#187557] stroke-[1.8]" />;
      case "rock":
        return <Mountain className="w-4 h-4 text-[#4C7567] stroke-[1.8]" />;
      case "path":
        return <Footprints className="w-4 h-4 text-amber-700 stroke-[1.8]" />;
      default:
        return <Trees className="w-4 h-4 text-[#187557] stroke-[1.8]" />;
    }
  };

  return (
    <>


      <div className="fixed top-20 right-3.5 sm:right-6 z-30 pointer-events-auto max-w-[310px] w-[calc(100vw-28px)] animate-in fade-in zoom-in-95 duration-200 font-urbanist select-none antialiased">
        <div className="p-4 rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl text-[#0D3528] space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#0D3528]/8">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-2xl flex items-center justify-center shrink-0 bg-[#E4F4ED] border border-[#BCE5D3] shadow-2xs">
                {getIcon()}
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold capitalize truncate tracking-tight text-[#0D3528]">
                  {displayName}
                </h3>
                <p className="text-[10.5px] text-[#4C7567] truncate font-normal">
                  {isBulldozer
                    ? "Ancaman Inaktivitas"
                    : `Petak Lahan (${selectedObject.grid_x}, ${selectedObject.grid_y})`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedObject(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-transform active:scale-90 cursor-pointer shadow-2xs shrink-0"
              aria-label="Tutup inspeksi"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>

          {/* Content Body */}
          <div className="space-y-2.5">
            {/* Memori Fokus Card */}
            {!isBulldozer &&
              (selectedObject.object_type === "tree" ||
                selectedObject.task_note) && (
                <div className="p-3 rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-medium text-[#187557] flex items-center gap-1">
                      <span>🌱</span> Memori Fokus
                    </span>
                    <div className="flex items-center gap-1">
                      {selectedObject.focus_tag && (
                        <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D]">
                          {selectedObject.focus_tag}
                        </span>
                      )}
                      {selectedObject.focus_duration && (
                        <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-white border border-[#0D3528]/10 text-[#4C7567] tabular-nums">
                          {selectedObject.focus_duration}m
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11.5px] font-normal leading-relaxed text-[#0D3528] italic">
                    {selectedObject.task_note
                      ? `“${selectedObject.task_note}”`
                      : "Ditanam dari sesi fokus hening di pulau Rimba."}
                  </p>

                  <div className="text-[10.5px] flex items-center justify-between pt-1 border-t border-[#0D3528]/6 text-[#4C7567] font-normal">
                    <span>Ditanam pada</span>
                    <span className="font-medium text-[#0D3528]">
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
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 text-[#0D3528]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 stroke-[1.8]" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[12px] text-amber-950 tracking-tight">
                      Kru Konstruksi di Pulau
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-amber-900/80 font-normal">
                      Bulldozer akan menebang 1 pohon jika tidak ada aktivitas
                      selama 24 jam. Selesaikan sesi fokus atau halau dengan
                      Soul.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] flex justify-between px-1 text-[#4C7567] font-normal">
                  <span>Energi Penghalau:</span>
                  <span className="font-semibold text-amber-800 flex items-center gap-1 tabular-nums">
                    {bribeCost} Soul{" "}
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleFocusToSave}
                    className="py-2.5 px-3 rounded-full text-[12px] font-medium bg-[#187557] hover:bg-[#126046] text-white active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Fokus (Gratis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBribe}
                    disabled={!canAffordBribe}
                    className={`py-2.5 px-3 rounded-full text-[12px] font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      canAffordBribe
                        ? "bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 active:scale-95 shadow-2xs"
                        : "bg-black/5 border-black/10 text-[#4C7567]/40 cursor-not-allowed"
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
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 text-[#0D3528]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 stroke-[1.8]" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[12px] text-amber-950 tracking-tight">
                      Ditandai untuk Ditebang
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-amber-900/80 font-normal">
                      Kru konstruksi menandai pohon ini. Selesaikan 1 Sesi Fokus
                      untuk menyelamatkannya atau halau dengan 40 Soul.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] flex justify-between px-1 text-[#4C7567] font-normal">
                  <span>Energi Penyelamatan:</span>
                  <span className="font-semibold text-amber-800 flex items-center gap-1 tabular-nums">
                    {bribeCost} Soul{" "}
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleFocusToSave}
                    className="py-2.5 px-3 rounded-full text-[12px] font-medium bg-[#187557] hover:bg-[#126046] text-white active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Fokus</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBribe}
                    disabled={!canAffordBribe}
                    className={`py-2.5 px-3 rounded-full text-[12px] font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      canAffordBribe
                        ? "bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 active:scale-95 shadow-2xs"
                        : "bg-black/5 border-black/10 text-[#4C7567]/40 cursor-not-allowed"
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
            ) : isWithered ? (
              /* STATE 3A: WITHERED STUMP (RESTORE 50 SOUL) */
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 text-[#0D3528]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[1.8]" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[12px] text-rose-950 tracking-tight">
                      Tunggul Lapuk Hangus
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-rose-900/90 font-normal">
                      Pohon ini layu akibat sesi fokus yang terputus di tengah jalan. Lakukan ritual restorasi dengan {restoreCost} Soul untuk menyuburkan kembali tanah ini.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] flex justify-between px-1 text-[#4C7567] font-normal">
                  <span>Biaya Restorasi Tanah:</span>
                  <span className="font-semibold text-rose-800 flex items-center gap-1 tabular-nums">
                    {restoreCost} Soul{" "}
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={!canAffordRestore}
                  className={`w-full py-2.5 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    canAffordRestore
                      ? "bg-[#187557] hover:bg-[#126046] text-white active:scale-95 shadow-xs"
                      : "bg-black/5 border border-black/10 text-[#4C7567]/40 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {canAffordRestore
                      ? `Pulihkan Tanah (${restoreCost} Soul)`
                      : `Butuh ${restoreCost} Soul`}
                  </span>
                </button>
              </div>
            ) : isReclaimed ? (
              /* STATE 3: RECLAIMED MOSS (RESTORE) */
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 text-[#0D3528]">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 stroke-[1.8]" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[12px] text-amber-950 tracking-tight">
                      Tertutup Lumut Liar
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-amber-900/80 font-normal">
                      Pulihkan objek ini untuk mengembalikan kesegaran alaminya.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] flex justify-between px-1 text-[#4C7567] font-normal">
                  <span>Energi Pemulihan:</span>
                  <span className="font-semibold text-amber-800 flex items-center gap-1 tabular-nums">
                    {restoreCost} Soul{" "}
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={!canAffordRestore}
                  className={`w-full py-2.5 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    canAffordRestore
                      ? "bg-[#187557] hover:bg-[#126046] text-white active:scale-95 shadow-xs"
                      : "bg-black/5 border border-black/10 text-[#4C7567]/40 cursor-not-allowed"
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
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-[#BCE5D3] bg-[#E4F4ED]/80 text-[#0D3528]">
                  <CheckCircle2 className="w-4 h-4 text-[#187557] shrink-0 stroke-[2]" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[12.5px] text-[#0D3528]">
                      Subur & Terawat
                    </p>
                    <p className="text-[10.5px] text-[#4C7567] font-normal">
                      Tumbuh dari ketekunan fokusmu di Rimba.
                    </p>
                  </div>
                </div>

                {catalogItem?.description && (
                  <p className="text-[11px] italic text-[#4C7567] px-1 leading-relaxed font-normal">
                    &ldquo;{catalogItem.description}&rdquo;
                  </p>
                )}

                {/* Land Management Controls */}
                {!activeSession && (
                  <div className="pt-2 border-t border-[#0D3528]/8 space-y-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#4C7567] px-1">
                      Tata Letak & Lahan
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleStartRelocate}
                        className="py-2.5 px-3 rounded-full text-[12px] font-medium border border-[#0D3528]/12 bg-white hover:bg-[#E4F4ED]/50 text-[#0D3528] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Pindahkan objek ke petak lain"
                      >
                        <Move className="w-3.5 h-3.5 stroke-[1.8]" />
                        <span>Pindahkan</span>
                      </button>

                      {selectedObject.object_type === "tree" ? (
                        isReclaimed ? (
                          <button
                            type="button"
                            onClick={handleRemove}
                            className="py-2.5 px-3 rounded-full text-[12px] font-medium bg-[#E4F4ED] hover:bg-[#d5eee2] border border-[#BCE5D3] text-[#14664D] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Bersihkan tunggul kayu lapuk untuk memulihkan kesuburan tanah (Gratis)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#187557] stroke-[1.8]" />
                            <span>Bersihkan (Gratis)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRemove}
                            disabled={gold < 2}
                            className={`py-2.5 px-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
                              gold >= 2
                                ? "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 active:scale-95 cursor-pointer"
                                : "bg-black/5 border border-black/10 text-[#4C7567]/40 cursor-not-allowed"
                            }`}
                            title={
                              gold >= 2
                                ? "Mencabut pohon suaka hidup berkonsekuensi -2 Soul demi keseimbangan alam"
                                : "Butuh minimal 2 Soul untuk mencabut pohon hidup"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                            <span>Cabut (-2 Soul)</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={handleRemove}
                          className="py-2.5 px-3 rounded-full text-[12px] font-medium bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title={`Bongkar objek dan daur ulang material (+${refundAmount} Soul)`}
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                          <span>Bongkar (+{refundAmount})</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
