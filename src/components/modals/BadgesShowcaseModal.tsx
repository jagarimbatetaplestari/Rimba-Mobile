"use client";

import React, { useState, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  evaluateAchievements,
  AchievementProgress,
} from "@/lib/game/achievements";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { X, Award, CheckCircle2, Lock, Sparkles, Share2 } from "lucide-react";

interface BadgesShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareBadge?: (badgeTitle: string, badgeIcon: string) => void;
}

export function BadgesShowcaseModal({
  isOpen,
  onClose,
  onShareBadge,
}: BadgesShowcaseModalProps) {
  const saveData = useGameStore((state) => state.saveData);
  const claimAchievement = useGameStore((state) => state.claimAchievement);

  const [selectedBadge, setSelectedBadge] =
    useState<AchievementProgress | null>(null);
  const [filterCategory, setFilterCategory] = useState<
    "all" | "focus" | "nature" | "world"
  >("all");

  const achievements = useMemo(
    () => evaluateAchievements(saveData),
    [saveData],
  );

  if (!isOpen) return null;

  const filteredItems = (achievements.items || []).filter((item) => {
    if (filterCategory === "all") return true;
    return item.config.category === filterCategory;
  });

  const handleClaim = (badgeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundManager.playLevelUp();
    hapticSuccess();
    claimAchievement(badgeId);
  };

  const handleSelectBadge = (badge: AchievementProgress) => {
    soundManager.playPop();
    hapticLight();
    setSelectedBadge(badge);
  };

  const handleShareCurrentBadge = () => {
    if (!selectedBadge) return;
    soundManager.playPop();
    hapticLight();
    if (onShareBadge) {
      onShareBadge(selectedBadge.config.title, selectedBadge.config.icon);
    }
  };

  const completionPct = Math.round(
    (achievements.completedCount / Math.max(1, achievements.totalCount)) * 100,
  );

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
      {/* Backdrop Blur */}
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
        {/* Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              Lencana Prestasi
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              {achievements.completedCount}/{achievements.totalCount} Terbuka
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup lencana"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Overall Progress Bento Card */}
        <div className="rounded-[22px] border border-white/85 bg-white/75 p-3.5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#456b57]">
            <span>Kemajuan Koleksi Medali</span>
            <span className="font-mono font-bold text-[#1e5638]">
              {completionPct}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#143525]/10 overflow-hidden">
            <div
              className="h-full bg-[#1e5638] rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* Filter Segmented Pills */}
        <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-4 gap-1">
          {[
            { id: "all", label: "Semua" },
            { id: "focus", label: "Fokus" },
            { id: "nature", label: "Alam" },
            { id: "world", label: "Pulau" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                hapticLight();
                setFilterCategory(tab.id as typeof filterCategory);
              }}
              className={`py-1.5 rounded-full text-[11.5px] font-semibold transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? "bg-white text-[#143525] shadow-xs"
                  : "text-[#456b57] hover:text-[#143525]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badges 2-Column Bento Grid */}
        <div className="grid grid-cols-2 gap-2.5 overflow-y-auto no-scrollbar flex-1 pr-0.5">
          {filteredItems.map((item) => {
            const isClaimed = item.isClaimed;
            const isUnlocked = item.isUnlocked;

            return (
              <div
                key={item.id}
                onClick={() => handleSelectBadge(item)}
                className={`p-3 rounded-[22px] border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                  isClaimed
                    ? "border-white/85 bg-white/80 shadow-2xs"
                    : isUnlocked
                      ? "border-amber-300 bg-amber-50/70 shadow-xs"
                      : "border-white/60 bg-white/40 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl leading-none">
                      {item.config.icon}
                    </span>
                    {isClaimed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1e5638]" />
                    ) : isUnlocked ? (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold animate-pulse">
                        KLAIM
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#456b57]/50" />
                    )}
                  </div>

                  <h4 className="text-[13px] font-semibold text-[#143525] truncate">
                    {item.config.title}
                  </h4>
                  <p className="text-[10.5px] text-[#456b57] line-clamp-2 mt-0.5 leading-snug">
                    {item.config.description}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-[#143525]/8">
                  {isUnlocked && !isClaimed ? (
                    <button
                      type="button"
                      onClick={(e) => handleClaim(item.id, e)}
                      className="w-full py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10.5px] font-bold flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>+{item.config.reward.gold} Soul</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#456b57]">
                      <span>{item.percent}%</span>
                      <span>
                        {item.currentValue}/{item.targetValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Badge Detail Modal */}
        {selectedBadge && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedBadge(null);
            }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in pointer-events-auto"
          >
            <div className="relative w-full max-w-[310px] rounded-[30px] border border-white/90 bg-[#edf5f0] p-5 space-y-3 text-center shadow-2xl animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="absolute top-3.5 right-3.5 h-7 w-7 rounded-full bg-white/70 hover:bg-white text-[#143525] flex items-center justify-center transition-all active:scale-90 shadow-2xs"
                aria-label="Tutup detail lencana"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-15 h-15 rounded-full bg-white border border-white flex items-center justify-center text-4xl mx-auto shadow-sm">
                {selectedBadge.config.icon}
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-[#143525]">
                  {selectedBadge.config.title}
                </h3>
                <p className="text-[11.5px] text-[#1e5638] font-medium mt-0.5">
                  {selectedBadge.config.subtitle}
                </p>
              </div>

              <p className="text-[11.5px] text-[#456b57] leading-relaxed px-1">
                {selectedBadge.config.description}
              </p>

              <blockquote className="p-2.5 rounded-[18px] bg-white/60 border border-white/80 text-[10.5px] text-[#456b57] italic leading-snug">
                "{selectedBadge.config.quote}"
              </blockquote>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold pt-1">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />+
                  {selectedBadge.config.reward.gold} Soul
                </span>
                <span className="px-3 py-1 rounded-full bg-[#bfdac8]/40 text-[#143525] border border-[#bfdac8]/60 text-[11px]">
                  +{selectedBadge.config.reward.xp} XP
                </span>
              </div>

              <div className="space-y-1.5 pt-2">
                {selectedBadge.isUnlocked && !selectedBadge.isClaimed && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClaim(selectedBadge.id);
                      setSelectedBadge((prev) =>
                        prev ? { ...prev, isClaimed: true } : null,
                      );
                    }}
                    className="w-full py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[12px] shadow-xs active:scale-95 transition-all"
                  >
                    Klaim Hadiah Medali
                  </button>
                )}

                {selectedBadge.isClaimed && onShareBadge && (
                  <button
                    type="button"
                    onClick={() => {
                      handleShareCurrentBadge();
                      setSelectedBadge(null);
                    }}
                    className="w-full py-2.5 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Pamerkan Lencana</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
