"use client";

import React, { useState, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { calculateAnalytics } from "@/lib/game/analytics";
import {
  generateLeaderboard,
  RANGER_HALL_OF_FAME_TIERS,
  RangerTier,
} from "@/lib/game/community";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import {
  X,
  Flame,
  TreePine,
  Clock,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

interface MobileLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileLeaderboardModal({
  isOpen,
  onClose,
}: MobileLeaderboardModalProps) {
  const saveData = useGameStore((state) => state.saveData);
  const [activeTab, setActiveTab] = useState<"tiers" | "stats">("tiers");

  const sessions = saveData.focus_sessions || [];
  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  const leaderboardData = useMemo(() => {
    return generateLeaderboard(saveData, analytics, "focus");
  }, [saveData, analytics]);

  const currentUserEntry = leaderboardData[0];
  const totalMinutes = analytics.totalFocusMinutes;
  const activeTrees = currentUserEntry?.treesCount || 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased"
      style={{
        background:
          "linear-gradient(180deg, #d4e7dc 0%, #c5dfd1 45%, #b4d3c2 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Ambient Light Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 255, 255, 0.5), transparent 70%)",
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
              Papan Kehormatan
            </h2>
            <span className="text-[12.5px] font-normal text-[#456b57]">
              Piramida Ranger
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup peringkat"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Hero Current User Rank Bento Card */}
        {currentUserEntry && (
          <div className="rounded-[24px] border border-white/90 bg-white/85 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#bfdac8]/50 border-2 border-white text-2xl shadow-xs">
                  {currentUserEntry.avatarEmoji}
                </div>

                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[15.5px] font-bold tracking-tight text-[#143525]">
                      {currentUserEntry.rangerName}
                    </span>
                    <span className="shrink-0 rounded-full border border-[#bfdac8]/60 bg-[#bfdac8]/50 px-2 py-0.5 text-[10px] font-semibold text-[#143525]">
                      Suaka Anda
                    </span>
                  </div>
                  <p className="truncate text-[12px] font-medium text-[#1e5638]">
                    {currentUserEntry.title}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e5638]/10 text-[#1e5638] text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Aktif
                </span>
              </div>
            </div>

            {/* 3 Metrics Pills */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#143525]/10 text-center">
              <div className="p-2 rounded-xl bg-white/60 border border-white/70">
                <div className="flex items-center justify-center gap-1 text-[#456b57] text-[10px] mb-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Fokus</span>
                </div>
                <div className="font-bold text-[13.5px] text-[#143525] font-mono">
                  {totalMinutes}m
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/60 border border-white/70">
                <div className="flex items-center justify-center gap-1 text-[#456b57] text-[10px] mb-0.5">
                  <TreePine className="w-3 h-3" />
                  <span>Pohon</span>
                </div>
                <div className="font-bold text-[13.5px] text-[#143525] font-mono">
                  {activeTrees}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/60 border border-white/70">
                <div className="flex items-center justify-center gap-1 text-[#456b57] text-[10px] mb-0.5">
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>Streak</span>
                </div>
                <div className="font-bold text-[13.5px] text-[#143525] font-mono">
                  {analytics.currentStreak} Hari
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Heading */}
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/80">
            Jenjang Kehormatan Ranger Rimba
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[#456b57]">
            <Trophy className="w-3.5 h-3.5 text-[#1e5638]" />
            <span>7 Tingkatan</span>
          </div>
        </div>

        {/* Tier Hierarchy List */}
        <div className="space-y-2">
          {RANGER_HALL_OF_FAME_TIERS.map((tier: RangerTier) => {
            const isUnlocked =
              totalMinutes >= tier.minMinutes && activeTrees >= tier.minTrees;
            const isCurrent = currentUserEntry?.title === tier.name;

            return (
              <div
                key={tier.id}
                className={`p-3.5 rounded-[22px] transition-all flex items-center justify-between ${
                  isCurrent
                    ? "border-2 border-[#1e5638] bg-white shadow-xs"
                    : isUnlocked
                    ? "border border-white/90 bg-white/80 shadow-2xs"
                    : "border border-white/50 bg-white/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg border ${
                      isUnlocked
                        ? "bg-[#bfdac8]/60 border-white text-xl shadow-2xs"
                        : "bg-black/5 border-black/10 text-base opacity-60"
                    }`}
                  >
                    {tier.badgeEmoji}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`truncate text-[13.5px] ${
                          isCurrent
                            ? "font-bold text-[#143525]"
                            : isUnlocked
                            ? "font-semibold text-[#143525]"
                            : "font-medium text-[#456b57]"
                        }`}
                      >
                        {tier.name}
                      </p>
                      {isCurrent && (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#1e5638] text-white">
                          Peringkatmu
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#456b57] font-light truncate">
                      {tier.description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e5638] bg-[#1e5638]/10 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Terbuka
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#456b57] bg-black/5 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5 opacity-60" />
                        {tier.minMinutes}m & {tier.minTrees}🌲
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy & Offline-First Sovereign Guarantee */}
        <div className="p-3.5 rounded-[20px] bg-white/60 border border-white/80 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#1e5638] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#456b57] leading-relaxed font-light">
            <strong className="font-semibold text-[#143525]">Kedaulatan Privasi Penuh:</strong> Rimba tidak menggunakan bot tiruan maupun telemetri pelacak. Seluruh jenjang dihitung murni dari waktu fokus dan pohon asli yang kamu tanam di perangkat ini.
          </p>
        </div>
      </div>
    </div>
  );
}
