"use client";

import React, { useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { calculateAnalytics } from "@/lib/game/analytics";
import {
  generateLeaderboard,
  RANGER_HALL_OF_FAME_TIERS,
  RangerTier,
  getNextRangerTier,
} from "@/lib/game/community";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
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
  const { t, translateTier } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);

  const sessions = saveData.focus_sessions || [];
  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  const leaderboardData = useMemo(() => {
    return generateLeaderboard(saveData, analytics, "focus");
  }, [saveData, analytics]);

  const currentUserEntry = leaderboardData[0];
  const totalMinutes = analytics.totalFocusMinutes;
  const activeTrees = currentUserEntry?.treesCount || 0;

  const currentTier = useMemo(() => {
    return (
      RANGER_HALL_OF_FAME_TIERS.find((tier) => tier.name === currentUserEntry?.title) ||
      RANGER_HALL_OF_FAME_TIERS[RANGER_HALL_OF_FAME_TIERS.length - 1]
    );
  }, [currentUserEntry?.title]);

  const currentUserTitle = useMemo(() => {
    if (!currentUserEntry?.title) return "";
    const matchingTier = RANGER_HALL_OF_FAME_TIERS.find(
      (tier) => tier.name === currentUserEntry.title,
    );
    return matchingTier ? translateTier(matchingTier).name : currentUserEntry.title;
  }, [currentUserEntry?.title, translateTier]);

  const nextTier = useMemo(() => {
    return getNextRangerTier(currentTier);
  }, [currentTier]);

  const nextTierProgress = useMemo(() => {
    if (!nextTier) return null;
    const minMinutesNeeded = Math.max(0, nextTier.minMinutes - totalMinutes);
    const minTreesNeeded = Math.max(0, nextTier.minTrees - activeTrees);

    const minutesRatio =
      nextTier.minMinutes > 0 ? Math.min(1, totalMinutes / nextTier.minMinutes) : 1;
    const treesRatio =
      nextTier.minTrees > 0 ? Math.min(1, activeTrees / nextTier.minTrees) : 1;
    const progressPct = Math.round(((minutesRatio + treesRatio) / 2) * 100);

    return {
      nextTier,
      translatedNextTier: translateTier(nextTier),
      minMinutesNeeded,
      minTreesNeeded,
      progressPct: Math.min(progressPct, 99),
    };
  }, [nextTier, totalMinutes, activeTrees, translateTier]);

  if (!isOpen) return null;

  return (
    <>
      {/* Tipografi Urbanist yang Halus & Modern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto bg-[#FAFAF7]"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md mx-auto px-5 safe-modal-content space-y-4">
          {/* HEADER NAV */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[23px] font-semibold tracking-normal text-[#0D3528]">
                {t.ranks.title}
              </h2>
              <span className="rounded-full bg-[#E4F4ED] border border-[#BCE5D3] px-3 py-0.5 text-[11.5px] font-medium text-[#14664D]">
                {t.ranks.subtitle}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D3528]/5 border border-[#0D3528]/10 text-[#0D3528] shadow-xs active:scale-90 transition-transform hover:bg-[#0D3528]/10 cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* 1. HERO CURRENT USER BENTO CARD (Translucent Blended White Gradient) */}
          {currentUserEntry && (
            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <RangerAvatar
                    avatarUrl={saveData.profile?.avatarUrl || currentUserEntry.avatarEmoji}
                    name={currentUserEntry.rangerName}
                    size="lg"
                    borderClassName="border-2 border-white shadow-xs"
                  />

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[17px] font-semibold tracking-wide text-[#0D3528]">
                        {currentUserEntry.rangerName}
                      </span>
                    </div>
                    <p className="truncate text-[12.5px] font-medium text-[#187557] mt-0.5">
                      {currentUserTitle}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D] text-[11px] font-medium">
                    <Sparkles className="w-3.5 h-3.5 stroke-[1.8] text-emerald-600" />
                    {t.common.active}
                  </span>
                </div>
              </div>

              {/* 3 Metrics (Open Airy Divide Layout - Tanpa Kotak Bertumpuk & No Mono) */}
              <div className="grid grid-cols-3 py-2 divide-x divide-[#0D3528]/10 border-t border-[#0D3528]/8 text-center">
                <div className="px-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#4C7567] text-[11px] mb-0.5 font-normal">
                    <Clock className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{t.stats.focusBadge}</span>
                  </div>
                  <div className="text-[20px] font-medium text-[#0D3528] tracking-normal">
                    {totalMinutes}
                    <span className="text-[12px] font-normal text-[#4C7567] ml-0.5">
                      m
                    </span>
                  </div>
                </div>

                <div className="px-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#4C7567] text-[11px] mb-0.5 font-normal">
                    <TreePine className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span>{t.ranks.treesLabel}</span>
                  </div>
                  <div className="text-[20px] font-medium text-[#0D3528] tracking-normal">
                    {activeTrees}
                  </div>
                  {saveData.islands && saveData.islands.length > 1 && (
                    <span className="text-[9px] text-[#187557] font-medium">
                      {t.ranks.archipelagoTotal}
                    </span>
                  )}
                </div>

                <div className="px-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#4C7567] text-[11px] mb-0.5 font-normal">
                    <Flame className="w-3.5 h-3.5 stroke-[1.8] text-amber-600" />
                    <span>Streak</span>
                  </div>
                  <div className="text-[20px] font-medium text-[#0D3528] tracking-normal">
                    {analytics.currentStreak}
                    <span className="text-[12px] font-normal text-[#4C7567] ml-0.5">
                      {t.common.days}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NEXT TIER MOTIVATION / PROGRESS CARD */}
          {nextTierProgress ? (
            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5 text-[#0D3528] font-semibold">
                  <span className="text-base">{nextTierProgress.nextTier.badgeEmoji}</span>
                  <span>
                    {t.ranks.nextTierGoal}:{" "}
                    <span className="text-[#187557] font-bold">
                      {nextTierProgress.translatedNextTier.name}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2 py-0.5 rounded-full tabular-nums">
                  {nextTierProgress.progressPct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[#0D3528]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2BB688] to-[#1E8E69] rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${Math.min(nextTierProgress.progressPct, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#4C7567]">
                <span>
                  {nextTierProgress.minMinutesNeeded > 0 && nextTierProgress.minTreesNeeded > 0
                    ? t.ranks.needMinutesAndTrees
                        .replace("{minutes}", String(nextTierProgress.minMinutesNeeded))
                        .replace("{trees}", String(nextTierProgress.minTreesNeeded))
                    : nextTierProgress.minMinutesNeeded > 0
                      ? t.ranks.needMinutesOnly.replace(
                          "{minutes}",
                          String(nextTierProgress.minMinutesNeeded),
                        )
                      : t.ranks.needTreesOnly.replace(
                          "{trees}",
                          String(nextTierProgress.minTreesNeeded),
                        )}
                </span>
                <span className="text-[10px] text-[#187557] font-medium">
                  {nextTierProgress.nextTier.minMinutes}m & {nextTierProgress.nextTier.minTrees}🌲
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-300/60 bg-gradient-to-b from-amber-50/90 to-amber-100/80 p-4 shadow-lg shadow-amber-900/5 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <p className="text-[13px] font-bold text-amber-900">
                    {t.ranks.highestTierReached}
                  </p>
                  <p className="text-[11px] text-amber-800/80 font-normal">
                    {currentUserTitle}
                  </p>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-amber-800 bg-white/80 border border-amber-300 px-2.5 py-1 rounded-full">
                MAX RANK
              </span>
            </div>
          )}

          {/* SECTION HEADER */}
          <div className="flex items-center justify-between px-1 pt-1">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
              {t.ranks.tiersHeader}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full">
              <Trophy className="w-3.5 h-3.5 text-[#187557] stroke-[1.8]" />
              <span>{t.ranks.tiersCount}</span>
            </div>
          </div>

          {/* 2. TIER HIERARCHY CARD (Translucent Container) */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 sm:p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-2.5">
            {RANGER_HALL_OF_FAME_TIERS.map((tier: RangerTier) => {
              const trTier = translateTier(tier);
              const isUnlocked =
                totalMinutes >= tier.minMinutes && activeTrees >= tier.minTrees;
              const isCurrent = currentUserEntry?.title === tier.name;

              return (
                <div
                  key={tier.id}
                  className={`p-3 rounded-2xl transition-all flex items-center justify-between ${
                    isCurrent
                      ? "border border-[#187557]/40 bg-[#E4F4ED]/80 shadow-xs"
                      : isUnlocked
                        ? "border border-white/80 bg-white/75 shadow-2xs"
                        : "border border-transparent bg-[#0D3528]/[0.02] opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                        isCurrent
                          ? "bg-white border-[#BCE5D3] shadow-2xs"
                          : isUnlocked
                            ? "bg-[#E4F4ED] border-white shadow-2xs"
                            : "bg-black/5 border-black/5 opacity-70"
                      }`}
                    >
                      {tier.badgeEmoji}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`truncate text-[13.5px] ${
                            isCurrent
                              ? "font-semibold text-[#0D3528]"
                              : isUnlocked
                                ? "font-medium text-[#0D3528]"
                                : "font-normal text-[#4C7567]"
                          }`}
                        >
                          {trTier.name}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#187557] text-white">
                            {t.ranks.yourRank}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#4C7567] font-normal truncate mt-0.5">
                        {trTier.description}
                      </p>
                      <p className="text-[10.5px] font-medium text-[#187557] flex items-center gap-1 mt-0.5 truncate">
                        <Sparkles className="w-3 h-3 text-emerald-600 stroke-[1.8]" />
                        <span>{trTier.perk}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3 stroke-[2]" />
                        {t.ranks.unlocked}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-normal text-[#4C7567] bg-black/5 px-2.5 py-1 rounded-full">
                        <Lock className="w-2.5 h-2.5 stroke-[2] opacity-60" />
                        {tier.minMinutes}m & {tier.minTrees}🌲
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. PRIVACY & SOVEREIGN GUARANTEE CARD */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl flex items-start gap-3">
            <div className="p-1.5 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] text-[#187557] shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 stroke-[1.8]" />
            </div>
            <p className="text-[12px] text-[#4C7567] leading-relaxed font-normal">
              <span className="font-semibold text-[#0D3528]">
                {t.ranks.privacyTitle}
              </span>{" "}
              {t.ranks.privacyDesc}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
