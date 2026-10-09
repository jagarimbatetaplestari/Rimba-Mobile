"use client";

import React, { useState, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  evaluateAchievements,
  AchievementProgress,
} from "@/lib/game/achievements";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { X, CheckCircle2, Lock, Sparkles, Share2 } from "lucide-react";

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
      >
        {/* Soft Ambient Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />

        {/* Main Glass Dialog */}
        <div className="relative z-10 w-full max-w-[375px] max-h-[90vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                Lencana Prestasi
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {achievements.completedCount}/{achievements.totalCount} Terbuka
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-all active:scale-90 cursor-pointer shadow-2xs"
              aria-label="Tutup lencana"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Overall Progress Bento */}
          <div className="rounded-2xl border border-[#0D3528]/8 bg-[#0D3528]/[0.025] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-[#4C7567]">
              <span>Kemajuan Koleksi Medali</span>
              <span className="text-[#0D3528] font-semibold tabular-nums">
                {completionPct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D3528]/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2BB688] to-[#187557] rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Filter Segmented Control */}
          <div className="rounded-full p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-4 gap-1">
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
                className={`py-1.5 rounded-full text-[11.5px] transition-all cursor-pointer ${
                  filterCategory === tab.id
                    ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
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
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                    isClaimed
                      ? "border-[#BCE5D3] bg-[#E4F4ED]/80 shadow-2xs"
                      : isUnlocked
                        ? "border-emerald-300/80 bg-emerald-50/80 shadow-xs"
                        : "border-transparent bg-[#0D3528]/[0.025] opacity-55"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl leading-none">
                        {item.config.icon}
                      </span>
                      {isClaimed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#187557] stroke-[2]" />
                      ) : isUnlocked ? (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium animate-pulse shadow-xs">
                          KLAIM
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#4C7567]/50 stroke-[1.8]" />
                      )}
                    </div>

                    <h4 className="text-[12.5px] font-semibold text-[#0D3528] truncate">
                      {item.config.title}
                    </h4>
                    <p className="text-[10.5px] text-[#4C7567] line-clamp-2 mt-0.5 leading-snug font-normal">
                      {item.config.description}
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-[#0D3528]/8">
                    {isUnlocked && !isClaimed ? (
                      <button
                        type="button"
                        onClick={(e) => handleClaim(item.id, e)}
                        className="w-full py-1.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[10.5px] font-medium flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-white fill-white" />
                        <span>+{item.config.reward.gold} Soul</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] font-normal text-[#4C7567] tabular-nums">
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
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in pointer-events-auto"
            >
              <div className="relative w-full max-w-[310px] rounded-3xl border border-white bg-white p-5 space-y-3.5 text-center shadow-2xl animate-in zoom-in-95 duration-150 text-[#0D3528] font-urbanist">
                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-3.5 right-3.5 h-7 w-7 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs z-10"
                  aria-label="Tutup detail lencana"
                >
                  <X className="w-3.5 h-3.5 stroke-[2]" />
                </button>

                <div className="w-16 h-16 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-4xl mx-auto shadow-xs">
                  {selectedBadge.config.icon}
                </div>

                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight text-[#0D3528]">
                    {selectedBadge.config.title}
                  </h3>
                  <p className="text-[12px] text-[#187557] font-medium mt-0.5">
                    {selectedBadge.config.subtitle}
                  </p>
                </div>

                <p className="text-[11.5px] text-[#4C7567] leading-relaxed px-1 font-normal">
                  {selectedBadge.config.description}
                </p>

                <blockquote className="p-2.5 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 text-[11px] text-[#0D3528] italic leading-snug font-normal">
                  "{selectedBadge.config.quote}"
                </blockquote>

                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 flex items-center gap-1 text-[11px] font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />+
                    {selectedBadge.config.reward.gold} Soul
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] text-[11px] font-medium">
                    +{selectedBadge.config.reward.xp} XP
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {selectedBadge.isUnlocked && !selectedBadge.isClaimed && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClaim(selectedBadge.id);
                        setSelectedBadge((prev) =>
                          prev ? { ...prev, isClaimed: true } : null,
                        );
                      }}
                      className="w-full py-2.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-[12px] shadow-xs active:scale-95 transition-all cursor-pointer"
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
                      className="w-full py-2.5 rounded-full bg-white border border-[#0D3528]/15 text-[#0D3528] hover:bg-[#E4F4ED]/40 font-medium text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Pamerkan Lencana</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
