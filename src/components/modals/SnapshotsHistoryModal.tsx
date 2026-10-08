"use client";

import React, { useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  getIslandSnapshots,
  createIslandSnapshot,
  deleteIslandSnapshot,
  IslandSnapshot,
} from "@/lib/game/backupManager";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import {
  X,
  History,
  Plus,
  Trash2,
  RotateCcw,
  TreePine,
  Coins,
  Check,
  Calendar,
  Sparkles,
  Clock,
} from "lucide-react";

interface SnapshotsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotsHistoryModal({
  isOpen,
  onClose,
}: SnapshotsHistoryModalProps) {
  const currentSaveData = useGameStore((state) => state.saveData);
  const importSaveData = useGameStore((state) => state.importSaveData);

  const [snapshots, setSnapshots] = useState<IslandSnapshot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getIslandSnapshots());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    soundManager.playPop();
    hapticSuccess();
    createIslandSnapshot(currentSaveData, newTitle);
    setSnapshots(getIslandSnapshots());
    setIsCreating(false);
    setNewTitle("");
  };

  const handleRestoreSnapshot = (snap: IslandSnapshot) => {
    soundManager.playComplete();
    hapticSuccess();
    importSaveData(snap.data);
    onClose();
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playPop();
    hapticLight();
    const updated = deleteIslandSnapshot(id);
    setSnapshots(updated);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 select-none antialiased animate-in fade-in duration-200 pointer-events-auto"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Backdrop Ethereal Blur */}
      <div
        className="fixed inset-0 bg-[#3d5e4b]/35 backdrop-blur-md transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container */}
      <div
        className="relative z-10 w-full max-w-[385px] max-h-[92vh] overflow-hidden rounded-[34px] border border-white/80 p-5 shadow-[0_24px_60px_rgba(15,45,28,0.22)] animate-in zoom-in-95 duration-200 flex flex-col space-y-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(239, 246, 241, 0.95) 0%, rgba(226, 238, 230, 0.93) 100%)",
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              Riwayat Snapshot
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              Titik Pemulihan
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup snapshot suaka"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Create Snapshot Card / Trigger */}
        {isCreating ? (
          <div className="p-3.5 rounded-[22px] border border-white/90 bg-white/85 shadow-2xs space-y-2.5 flex-shrink-0">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#2f5542]/75 block px-0.5">
              Nama Cuplikan Snapshot
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Suaka 50 Pohon Rimbun"
              className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#143525]/15 bg-white text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#456b57] hover:text-[#143525] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="px-4 py-1.5 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white text-xs font-semibold shadow-2xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsCreating(true);
            }}
            className="w-full py-2.5 px-3 rounded-full border border-white/90 bg-white/80 hover:bg-white text-xs font-semibold text-[#143525] shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-[#1e5638] stroke-[2.4]" />
            <span>Buat Snapshot Kondisi Saat Ini</span>
          </button>
        )}

        {/* Snapshots List */}
        <div className="space-y-2.5 overflow-y-auto no-scrollbar flex-1 pr-0.5">
          {snapshots.length === 0 ? (
            <div className="p-8 rounded-[26px] border border-white/80 bg-white/60 text-center space-y-2 my-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#bfdac8]/50 flex items-center justify-center text-[#143525] mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-[13px] font-semibold text-[#143525]">
                Belum Ada Snapshot Tersimpan
              </p>
              <p className="text-[11px] text-[#456b57] max-w-xs mx-auto leading-relaxed">
                Abadikan kemajuan suaka kapan saja untuk menyimpan tata letak
                pulau yang bisa dipulihkan kembali nanti.
              </p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-[22px] border border-white/85 bg-white/75 shadow-2xs space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-1">
                    <h4 className="text-[13.5px] font-semibold text-[#143525] truncate">
                      {snap.title}
                    </h4>
                    <span className="text-[10.5px] text-[#456b57] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(snap.createdAt)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                    className="p-1.5 rounded-full hover:bg-rose-50 text-[#456b57]/60 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    title="Hapus snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Details Pills */}
                <div className="flex items-center gap-1.5 text-[10.5px] flex-wrap pt-1 border-t border-[#143525]/8">
                  <span className="px-2 py-0.5 rounded-full bg-[#bfdac8]/40 border border-[#bfdac8]/60 text-[#143525] font-semibold flex items-center gap-1">
                    <TreePine className="w-3 h-3 text-[#1e5638]" />
                    {snap.treesCount} Pohon
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 font-semibold flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-600" />
                    {snap.gold.toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/80 border border-white/90 text-[#456b57] font-semibold">
                    Lv.{snap.level}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/80 border border-white/90 text-[#456b57] font-semibold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {snap.totalFocusMinutes}m
                  </span>
                </div>

                {/* Restore Button */}
                <button
                  type="button"
                  onClick={() => handleRestoreSnapshot(snap)}
                  className="w-full py-2 px-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-[11.5px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Pulihkan ke Kondisi Ini</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
