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
import { useTranslation } from "@/lib/i18n/translations";
import {
  X,
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
  const { t, language } = useTranslation();
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
    return `${d.toLocaleDateString(language === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString(language === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[115] flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-[375px] max-h-[90vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {t.snapshotsModal.title}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {t.snapshotsModal.subtitle}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Create Snapshot Trigger */}
          {isCreating ? (
            <div className="p-3.5 rounded-2xl border border-[#0D3528]/10 bg-[#0D3528]/[0.025] space-y-2.5 flex-shrink-0">
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#4C7567] block px-0.5">
                {t.snapshotsModal.createTitleLabel}
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.snapshotsModal.placeholder}
                className="w-full px-3.5 py-2 rounded-xl border border-[#0D3528]/15 bg-white text-xs text-[#0D3528] placeholder-[#4C7567]/40 outline-none focus:border-[#187557] focus:ring-1 focus:ring-[#187557]"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#4C7567] hover:text-[#0D3528] transition-colors cursor-pointer"
                >
                  {t.snapshotsModal.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  className="px-4 py-1.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-xs font-medium shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2]" />
                  <span>{t.snapshotsModal.save}</span>
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
              className="w-full py-2.5 px-3 rounded-full border border-[#0D3528]/12 bg-white hover:bg-[#E4F4ED]/50 text-xs font-medium text-[#0D3528] shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-[#187557] stroke-[2]" />
              <span>{t.snapshotsModal.createBtn}</span>
            </button>
          )}

          {/* Snapshots List */}
          <div className="space-y-2.5 overflow-y-auto no-scrollbar flex-1 pr-0.5">
            {snapshots.length === 0 ? (
              <div className="p-7 rounded-3xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] text-center space-y-2 my-2">
                <div className="w-10 h-10 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] mx-auto">
                  <Sparkles className="w-5 h-5 stroke-[1.8]" />
                </div>
                <p className="text-[13.5px] font-semibold text-[#0D3528]">
                  {t.snapshotsModal.emptyTitle}
                </p>
                <p className="text-[11.5px] text-[#4C7567] max-w-xs mx-auto leading-relaxed font-normal">
                  {t.snapshotsModal.emptyDesc}
                </p>
              </div>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3.5 rounded-2xl border border-[#0D3528]/8 bg-white/80 shadow-xs space-y-2.5 transition-all hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-1">
                      <h4 className="text-[13.5px] font-semibold text-[#0D3528] truncate">
                        {snap.title}
                      </h4>
                      <span className="text-[10.5px] text-[#4C7567] flex items-center gap-1 mt-0.5 font-normal">
                        <Calendar className="w-3 h-3 shrink-0 stroke-[1.8]" />
                        {formatDate(snap.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                      className="p-1.5 rounded-full hover:bg-rose-50 text-[#4C7567]/60 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title={t.common.cancel}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                    </button>
                  </div>

                  {/* Details Pills */}
                  <div className="flex items-center gap-1.5 text-[10.5px] flex-wrap pt-1 border-t border-[#0D3528]/6 font-normal">
                    <span className="px-2 py-0.5 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D] font-medium flex items-center gap-1">
                      <TreePine className="w-3 h-3 text-[#187557] stroke-[1.8]" />
                      {t.snapshotsModal.treesCount.replace("{count}", String(snap.treesCount))}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 font-medium flex items-center gap-1 tabular-nums">
                      <Coins className="w-3 h-3 text-amber-600 stroke-[1.8]" />
                      {snap.gold.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#0D3528]/10 text-[#4C7567] font-medium">
                      Lv.{snap.level}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#0D3528]/10 text-[#4C7567] font-medium flex items-center gap-1 tabular-nums">
                      <Clock className="w-2.5 h-2.5 stroke-[1.8]" />
                      {snap.totalFocusMinutes}m
                    </span>
                  </div>

                  {/* Restore Button */}
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="w-full py-2 px-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-[11.5px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{t.snapshotsModal.restoreBtn}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
