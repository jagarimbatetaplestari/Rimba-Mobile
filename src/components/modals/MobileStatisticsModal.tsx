"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  calculateAnalytics,
  calculatePeriodAnalytics,
  calculateCircadianFocusRhythm,
  getDetailedSessionsForDate,
  calculateFlowMastery,
  toLocalDateString,
  AnalyticsPeriod,
} from "@/lib/game/analytics";
import { getUnlockedTilesSet } from "@/lib/game/worldRules";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import {
  X,
  Flame,
  TreePine,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  PieChart,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Activity,
  Zap,
  Share2,
} from "lucide-react";
import { ShareSnapshotModal } from "@/components/modals/ShareSnapshotModal";

export interface MobileStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TAG_COLORS: Record<string, string> = {
  Fokus: "#187557",
  Kerja: "#2BB688",
  Belajar: "#3D8C60",
  Buku: "#4C7567",
  Riset: "#5FA78A",
  Kreatif: "#8DC7A5",
  Santai: "#A8D8BF",
};

export function MobileStatisticsModal({
  isOpen,
  onClose,
}: MobileStatisticsModalProps) {
  const { t, language, translateTag } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const sessions = saveData.focus_sessions || [];
  const world = saveData.world;
  const worldObjects = saveData.world_objects || [];

  // Period Selector State
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{
    dateStr: string;
    minutes: number;
  } | null>(null);
  const [drilldownDate, setDrilldownDate] = useState<{
    dateStr: string;
    label: string;
  } | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Global Analytics
  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  // Period Statistics
  const periodStats = useMemo(
    () => calculatePeriodAnalytics(sessions, period, periodOffset, new Date(), language),
    [sessions, period, periodOffset, language],
  );

  const maxBarMinutes = useMemo(() => {
    const max = Math.max(...periodStats.bars.map((b) => b.minutes), 1);
    return max;
  }, [periodStats.bars]);

  // Tag Distribution Breakdown for selected period
  const tagBreakdown = useMemo(() => {
    const dist = Object.keys(periodStats.tagDistribution).length > 0
      ? periodStats.tagDistribution
      : analytics.tagDistribution;
    const total = Object.values(dist).reduce(
      (a, b) => a + b,
      0,
    );
    return Object.entries(dist)
      .map(([label, minutes]) => ({
        id: label,
        label,
        minutes,
        percent: total > 0 ? Math.round((minutes / total) * 100) : 0,
        color: DEFAULT_TAG_COLORS[label] || "#187557",
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [periodStats.tagDistribution, analytics.tagDistribution]);

  // Trees and Stumps on the sanctuary island
  const { treesCount, stumpsCount } = useMemo(() => {
    let trees = 0;
    let stumps = 0;
    worldObjects.forEach((o) => {
      if (o.status === "reclaimed") {
        stumps += 1;
      } else if (o.object_type === "tree" && o.status === "active") {
        trees += 1;
      }
    });
    return { treesCount: trees, stumpsCount: stumps };
  }, [worldObjects]);

  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(world, worldObjects),
    [world, worldObjects],
  );

  // 12 Weeks Activity Heatmap Days (84 days)
  const heatmapWeeks = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (11 * 7 + today.getDay()));

    const weeks: {
      days: {
        dateStr: string;
        minutes: number;
        isToday: boolean;
        label: string;
      }[];
    }[] = [];

    let current = new Date(startDate);
    const todayStr = toLocalDateString(today);

    for (let w = 0; w < 12; w++) {
      const daysInWeek = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toLocalDateString(current);
        const stat = analytics.activityMap[dateStr];
        const isToday = dateStr === todayStr;

        daysInWeek.push({
          dateStr,
          minutes: stat?.totalMinutes || 0,
          isToday,
          label: current.toLocaleDateString(language === "en" ? "en-US" : "id-ID", {
            day: "numeric",
            month: "short",
          }),
        });

        current.setDate(current.getDate() + 1);
      }
      weeks.push({ days: daysInWeek });
    }
    return weeks;
  }, [analytics.activityMap, language]);

  // Circadian Rhythm (24h) calculated specifically for the selected period's sessions!
  const circadianData = useMemo(
    () => calculateCircadianFocusRhythm(periodStats.filteredSessions, language),
    [periodStats.filteredSessions, language],
  );
  const flowMastery = useMemo(
    () => calculateFlowMastery(sessions, stumpsCount),
    [sessions, stumpsCount],
  );
  const drilldownSessions = useMemo(() => {
    if (!drilldownDate) return [];
    return getDetailedSessionsForDate(sessions, drilldownDate.dateStr);
  }, [sessions, drilldownDate]);

  const maxHourlyMinutes = useMemo(() => {
    return Math.max(...circadianData.hourlyMinutes, 1);
  }, [circadianData.hourlyMinutes]);

  if (!isOpen) return null;

  const totalHours = Math.floor(analytics.totalFocusMinutes / 60);
  const remainingMins = analytics.totalFocusMinutes % 60;
  const successRate =
    analytics.totalCompletedSessions + stumpsCount > 0
      ? Math.round(
          (analytics.totalCompletedSessions /
            (analytics.totalCompletedSessions + stumpsCount)) *
            100,
        )
      : 100;

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
        className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto"
        style={{
          background:
            "radial-gradient(130% 90% at 50% -5%, #38B28B 0%, #289874 34%, #1C7459 70%, #165643 100%)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md mx-auto px-5 pt-[max(calc(env(safe-area-inset-top,0px)+16px),24px)] pb-[max(calc(env(safe-area-inset-bottom,0px)+24px),32px)] space-y-4">
          {/* HEADER NAV */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs">
                {t.stats.title}
              </h2>
              <span className="rounded-full bg-white/20 border border-white/25 px-3 py-0.5 text-[11.5px] font-medium text-emerald-50 backdrop-blur-md">
                {t.stats.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setIsShareOpen(true);
                }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer text-[12px] font-medium"
                title={t.stats.shareBannerTitle}
              >
                <Share2 className="h-3.5 w-3.5 stroke-[2.2]" />
                <span>{t.common.share}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  onClose();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 1. RINGKASAN UTAMA (SIMETRIS & AIRY)                      */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
              {t.stats.overviewSection}
            </p>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3">
                {/* Total Waktu */}
                <div className="p-3.5 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                    <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D]">
                      {t.stats.focusBadge}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[20px] font-semibold tracking-normal text-[#0D3528] tabular-nums">
                      {totalHours > 0
                        ? `${totalHours}${language === "en" ? "h" : "j"} ${remainingMins}m`
                        : `${remainingMins}m`}
                    </p>
                    <p className="text-[11.5px] leading-snug text-[#4C7567] mt-0.5 font-normal">
                      {t.stats.sessionsDone.replace("{count}", String(analytics.totalCompletedSessions))}
                    </p>
                  </div>
                </div>

                {/* Tingkat Sukses */}
                <div className="p-3.5 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                    <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D]">
                      {t.stats.completionBadge}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[20px] font-semibold tracking-normal text-[#0D3528] tabular-nums">
                      {successRate}%
                    </p>
                    <p className="text-[11.5px] leading-snug text-[#4C7567] mt-0.5 font-normal">
                      {stumpsCount > 0
                        ? t.stats.interruptedSessions.replace("{count}", String(stumpsCount))
                        : t.stats.perfectDiscipline}
                    </p>
                  </div>
                </div>

                {/* Runtutan (Streak) */}
                <div className="p-3.5 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Flame className="h-4 w-4 text-amber-600 stroke-[1.8]" />
                    <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800">
                      {t.stats.streakBadge}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[20px] font-semibold tracking-normal text-[#0D3528] tabular-nums">
                      {analytics.currentStreak} {t.common.days}
                    </p>
                    <p className="text-[11.5px] leading-snug text-[#4C7567] mt-0.5 font-normal">
                      {t.stats.bestStreak.replace("{days}", String(analytics.longestStreak))}
                    </p>
                  </div>
                </div>

                {/* Flora & Lahan */}
                <div className="p-3.5 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <TreePine className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                    <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D]">
                      {t.stats.treesBadge}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[20px] font-semibold tracking-normal text-[#0D3528] tabular-nums">
                      {t.stats.treesCountVal.replace("{count}", String(treesCount))}
                    </p>
                    <p className="text-[11.5px] leading-snug text-[#4C7567] mt-0.5 font-normal">
                      {t.stats.tilesUnlockedVal.replace("{count}", String(unlockedSet.size))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flow Mastery Banner */}
              <div className="mt-3 pt-3 border-t border-[#0D3528]/8 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] text-[#187557] shadow-2xs">
                    <Zap className="h-4 w-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-[#0D3528]">
                        {language === "en" ? "Focus Score" : "Skor Fokus"}: {flowMastery.flowHarmonyScore}/100
                      </p>
                      <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3]">
                        {flowMastery.flowHarmonyScore >= 80
                          ? language === "en" ? "Consistent" : "Konsisten"
                          : language === "en" ? "Growing" : "Bertumbuh"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4C7567] mt-0.5 font-normal">
                      {language === "en"
                        ? `${flowMastery.deepWorkCount} deep focus sessions (≥25m) · Avg ${flowMastery.avgSessionMinutes}m/session`
                        : `${flowMastery.deepWorkCount} sesi fokus penuh (≥25m) · Rata-rata ${flowMastery.avgSessionMinutes}m/sesi`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. AKTIVITAS WAKTU & PERIODE (BAR CHART)                  */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
              {t.stats.activitySection}
            </p>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              {/* Segmented Control Pill */}
              <div className="p-1 rounded-full bg-[#0D3528]/7 border border-white/60 grid grid-cols-4 gap-1">
                {(
                  [
                    { id: "day", label: t.stats.periodDay },
                    { id: "week", label: t.stats.periodWeek },
                    { id: "month", label: t.stats.periodMonth },
                    { id: "year", label: t.stats.periodYear },
                  ] as { id: AnalyticsPeriod; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setPeriod(tab.id);
                      setPeriodOffset(0);
                      setSelectedBarIdx(null);
                    }}
                    className={`py-1.5 rounded-full text-[11.5px] font-medium transition-all cursor-pointer ${
                      period === tab.id
                        ? "bg-[#187557] text-white shadow-xs"
                        : "text-[#4C7567] hover:text-[#0D3528]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Header Navigasi Periode */}
              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setPeriodOffset((o) => o - 1);
                    setSelectedBarIdx(null);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/80 hover:bg-white active:scale-90 text-[#0D3528] transition-transform cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4 stroke-[2]" />
                </button>

                <div className="text-center">
                  <p className="text-[14px] font-semibold text-[#0D3528] tracking-wide">
                    {periodStats.periodLabel}
                  </p>
                  <p className="text-[11.5px] font-normal text-[#4C7567]">
                    {periodStats.totalMinutes} {t.common.Minutes} ·{" "}
                    {periodStats.completedCount} {language === "en" ? "Sessions" : "Sesi"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={periodOffset >= 0}
                  onClick={() => {
                    hapticLight();
                    setPeriodOffset((o) => Math.min(0, o + 1));
                    setSelectedBarIdx(null);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/80 hover:bg-white disabled:opacity-30 active:scale-90 text-[#0D3528] transition-transform cursor-pointer shadow-xs"
                  title="Periode Berikutnya"
                >
                  <ChevronRight className="h-4 w-4 stroke-[2]" />
                </button>
              </div>

              {/* Area Visualisasi Bar Chart */}
              <div className="relative pt-6 pb-1">
                {/* Garis Bantu */}
                <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-[#0D3528]/15 w-full" />
                  <div className="border-b border-dashed border-[#0D3528]/15 w-full" />
                  <div className="border-b border-dashed border-[#0D3528]/20 w-full" />
                </div>

                {/* Bar Capsules Row */}
                <div className="relative h-32 flex items-end justify-between gap-1.5 px-1">
                  {periodStats.bars.map((bar, idx) => {
                    const heightPct =
                      bar.minutes > 0
                        ? Math.max(
                            14,
                            Math.round((bar.minutes / maxBarMinutes) * 100),
                          )
                        : 6;
                    const isSelected = selectedBarIdx === idx;

                    return (
                      <div
                        key={`${bar.label}_${idx}`}
                        onClick={() => {
                          hapticLight();
                          setSelectedBarIdx(isSelected ? null : idx);
                        }}
                        className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                      >
                        {/* Tooltip Nilai */}
                        <div
                          className={`mb-1 transition-all text-center ${
                            bar.minutes > 0 || isSelected
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {bar.minutes > 0 ? (
                            <span className="text-[10px] font-medium text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-1.5 py-0.5 rounded-full shadow-2xs">
                              {bar.minutes}m
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-[#4C7567]/50 font-normal">
                              0
                            </span>
                          )}
                        </div>

                        {/* Bar Kapsul */}
                        <div className="w-full max-w-[20px] flex-1 flex items-end">
                          <div
                            className={`w-full rounded-full transition-all duration-300 ${
                              bar.minutes > 0
                                ? "bg-gradient-to-t from-[#187557] to-[#2BB688] shadow-xs"
                                : "bg-[#0D3528]/10"
                            } ${
                              isSelected
                                ? "ring-2 ring-[#187557] ring-offset-1 scale-[1.08]"
                                : ""
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>

                        {/* Label Sumbu X */}
                        <span
                          className={`text-[10.5px] truncate mt-2 tracking-tight ${
                            isSelected
                              ? "font-semibold text-[#0D3528]"
                              : "font-normal text-[#4C7567]"
                          }`}
                        >
                          {bar.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peak Headline Pill */}
              {periodStats.peakHeadline && (
                <div className="p-2.5 px-3 rounded-2xl bg-[#E4F4ED]/80 border border-[#BCE5D3] flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#187557] shrink-0 stroke-[1.8]" />
                  <p className="text-[11.5px] text-[#0D3528] font-medium tracking-tight leading-tight truncate">
                    {periodStats.peakHeadline}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. JAM RITME SIRKADIAN (24-HOUR FOCUS CLOCK)               */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
              {t.stats.circadianSection}
            </p>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                  <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                    {t.stats.circadianTitle}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full">
                  {t.stats.circadianBadge}
                </span>
              </div>

              {/* Diurnal Quadrants Summary Pills */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-2xl bg-[#0D3528]/[0.03] border border-[#0D3528]/8">
                  <div className="flex items-center justify-center gap-1 text-[#187557]">
                    <Sunrise className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{t.stats.dawn}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#0D3528] mt-1 tabular-nums">{circadianData.quadrantSummaries.dawn}m</p>
                  <span className="text-[8.5px] text-[#4C7567]">04:00-10:00</span>
                </div>
                <div className="p-2 rounded-2xl bg-[#0D3528]/[0.03] border border-[#0D3528]/8">
                  <div className="flex items-center justify-center gap-1 text-amber-600">
                    <Sun className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{t.stats.day}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#0D3528] mt-1 tabular-nums">{circadianData.quadrantSummaries.day}m</p>
                  <span className="text-[8.5px] text-[#4C7567]">10:00-16:00</span>
                </div>
                <div className="p-2 rounded-2xl bg-[#0D3528]/[0.03] border border-[#0D3528]/8">
                  <div className="flex items-center justify-center gap-1 text-orange-600">
                    <Sunset className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{t.stats.sunset}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#0D3528] mt-1 tabular-nums">{circadianData.quadrantSummaries.sunset}m</p>
                  <span className="text-[8.5px] text-[#4C7567]">16:00-20:00</span>
                </div>
                <div className="p-2 rounded-2xl bg-[#0D3528]/[0.03] border border-[#0D3528]/8">
                  <div className="flex items-center justify-center gap-1 text-indigo-600">
                    <Moon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{t.stats.night}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#0D3528] mt-1 tabular-nums">{circadianData.quadrantSummaries.night}m</p>
                  <span className="text-[8.5px] text-[#4C7567]">20:00-04:00</span>
                </div>
              </div>

              {/* 24-Hour Interactive Bar Capsules */}
              <div className="relative pt-4 pb-1">
                <div className="relative h-24 flex items-end justify-between gap-[2px]">
                  {circadianData.hourlyMinutes.map((mins, h) => {
                    const heightPct = mins > 0 ? Math.max(14, Math.round((mins / maxHourlyMinutes) * 100)) : 8;
                    const isSelected = selectedHour === h;
                    const isPeak = mins === circadianData.peakHourMinutes && mins > 0;

                    return (
                      <div
                        key={`hour_${h}`}
                        onClick={() => {
                          hapticLight();
                          setSelectedHour(isSelected ? null : h);
                        }}
                        className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                      >
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className={`w-full rounded-full transition-all duration-300 ${
                              mins > 0
                                ? isPeak
                                  ? "bg-gradient-to-t from-amber-500 to-amber-300 shadow-xs"
                                  : "bg-gradient-to-t from-[#187557] to-[#2BB688]"
                                : "bg-[#0D3528]/10"
                            } ${
                              isSelected ? "ring-2 ring-[#0D3528] scale-125" : ""
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Hour ticks */}
                <div className="flex justify-between text-[8.5px] text-[#4C7567] mt-1.5 px-0.5">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>

              {/* Selected Hour or Peak Info Banner */}
              <div className="p-2.5 px-3 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[#0D3528]">
                  <Sparkles className="w-3.5 h-3.5 text-[#187557] shrink-0" />
                  {selectedHour !== null ? (
                    <span>
                      <strong>{String(selectedHour).padStart(2, '0')}:00 – {String((selectedHour + 1) % 24).padStart(2, '0')}:00</strong>:{" "}
                      <strong>{circadianData.hourlyMinutes[selectedHour]} {t.common.minShort}</strong>
                    </span>
                  ) : (
                    <span>
                      {t.stats.goldenHour} <strong>{circadianData.peakWindowLabel}</strong>
                    </span>
                  )}
                </div>
                {selectedHour !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedHour(null)}
                    className="text-[10.5px] text-[#14664D] underline font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. DISTRIBUSI KATEGORI (RING DONUT & LIST)                */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
              {t.stats.categorySection}
            </p>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                  <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                    {t.stats.categoryTitle}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full">
                  {t.stats.allTime}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {/* Donut Chart Ring */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 160 160"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="transparent"
                      stroke="#0D3528"
                      strokeOpacity="0.08"
                      strokeWidth="15"
                    />
                    {(() => {
                      const radius = 56;
                      const circumference = 2 * Math.PI * radius;
                      let cumulativePercent = 0;
                      const totalMins = tagBreakdown.reduce(
                        (acc, t) => acc + t.minutes,
                        0,
                      );
                      if (totalMins === 0) return null;

                      return tagBreakdown.map((item) => {
                        const frac = item.minutes / totalMins;
                        const strokeLen = frac * circumference;
                        const offset = -cumulativePercent * circumference;
                        cumulativePercent += frac;
                        const isHighlighted = selectedTagId === item.id;

                        return (
                          <circle
                            key={item.id}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth={isHighlighted ? 19 : 15}
                            strokeDasharray={`${strokeLen} ${circumference}`}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onClick={() => {
                              hapticLight();
                              setSelectedTagId((prev) =>
                                prev === item.id ? null : item.id,
                              );
                            }}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Donut Center Focus Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[19px] font-semibold text-[#0D3528] leading-none tabular-nums">
                      {analytics.totalFocusMinutes}m
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#4C7567] font-medium mt-1">
                      Total
                    </span>
                  </div>
                </div>

                {/* Tag Breakdown List */}
                <div className="flex-1 w-full space-y-1.5">
                  {tagBreakdown.length === 0 ? (
                    <p className="text-[12px] text-[#4C7567]/60 italic py-3 text-center">
                      {t.stats.noDataYet}
                    </p>
                  ) : (
                    tagBreakdown.map((item) => {
                      const isSelected = selectedTagId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            hapticLight();
                            setSelectedTagId((prev) =>
                              prev === item.id ? null : item.id,
                            );
                          }}
                          className={`p-2 rounded-2xl transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#E4F4ED]/80 border border-[#BCE5D3] shadow-xs"
                              : "hover:bg-white/60"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-medium text-[#0D3528] text-[12.5px] truncate">
                                {translateTag(item.label)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11.5px] shrink-0 font-normal">
                              <span className="text-[#0D3528] font-medium">
                                {item.minutes}m
                              </span>
                              <span className="text-[#4C7567]">
                                ({item.percent}%)
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Mini */}
                          <div className="w-full h-1.5 rounded-full bg-[#0D3528]/8 overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${item.percent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. KONSISTENSI HARIAN (ACTIVITY HEATMAP 12 MINGGU)         */}
          {/* ========================================================= */}
          <div className="space-y-1.5">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
              {t.stats.consistencySection}
            </p>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#187557] stroke-[1.8]" />
                  <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                    {t.stats.heatmapTitle}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full">
                  {t.stats.last84Days}
                </span>
              </div>

              {/* Selected Day Toast */}
              {selectedHeatmapDay && (
                <div className="p-2.5 px-3.5 rounded-2xl bg-[#187557] text-white text-[11.5px] font-normal flex items-center justify-between shadow-xs animate-in fade-in duration-150">
                  <span>{selectedHeatmapDay.dateStr}</span>
                  <span className="font-medium text-emerald-100">
                    {selectedHeatmapDay.minutes > 0
                      ? `${selectedHeatmapDay.minutes} ${t.common.Minutes}`
                      : t.stats.noFocusDay}
                  </span>
                </div>
              )}

              {/* Heatmap Grid */}
              <div className="overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                <div className="flex gap-1.5 min-w-[270px] justify-between">
                  {heatmapWeeks.map((week, wIdx) => (
                    <div
                      key={`week_${wIdx}`}
                      className="flex flex-col gap-1.5 flex-1"
                    >
                      {week.days.map((day) => {
                        const minutes = day.minutes;
                        let bgClass = "bg-[#0D3528]/8 border-transparent";
                        if (minutes > 0 && minutes < 25) {
                          bgClass = "bg-[#BCE5D3] border-[#A3D9C0]";
                        } else if (minutes >= 25 && minutes < 60) {
                          bgClass = "bg-[#38B28B] border-[#2DA07C]";
                        } else if (minutes >= 60) {
                          bgClass = "bg-[#187557] border-[#136148]";
                        }

                        const isSelected =
                          selectedHeatmapDay?.dateStr === day.dateStr;

                        return (
                          <div
                            key={day.dateStr}
                            onClick={() => {
                              hapticLight();
                              if (isSelected) {
                                setSelectedHeatmapDay(null);
                                setDrilldownDate(null);
                              } else {
                                setSelectedHeatmapDay({
                                  dateStr: day.label,
                                  minutes: day.minutes,
                                });
                                setDrilldownDate({
                                  dateStr: day.dateStr,
                                  label: day.label,
                                });
                              }
                            }}
                            className={`aspect-square rounded-[6px] border transition-all duration-150 cursor-pointer hover:scale-110 ${bgClass} ${
                              day.isToday ? "ring-2 " : ""
                            } ${isSelected ? "ring-2 ring-[#0D3528] scale-115" : ""}`}
                            title={`${day.label}: ${minutes}m`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap Intensity Legend */}
              <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#4C7567] font-normal">
                <span>{t.stats.less}</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[4px] bg-[#0D3528]/8" />
                  <span className="w-2.5 h-2.5 rounded-[4px] bg-[#BCE5D3]" />
                  <span className="w-2.5 h-2.5 rounded-[4px] bg-[#38B28B]" />
                  <span className="w-2.5 h-2.5 rounded-[4px] bg-[#187557]" />
                </div>
                <span>{t.stats.more}</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 5. RINCIAN SESI HARIAN INTERAKTIF (DRILLDOWN)             */}
          {/* ========================================================= */}
          {drilldownDate && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between px-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  {language === "en" ? "Sessions:" : "Riwayat Sesi:"} {drilldownDate.label}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setDrilldownDate(null);
                    setSelectedHeatmapDay(null);
                  }}
                  className="text-[11.5px] text-white/90 hover:text-white underline cursor-pointer"
                >
                  {t.common.close}
                </button>
              </div>

              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-2">
                {drilldownSessions.length === 0 ? (
                  <p className="text-[12px] text-[#4C7567] italic py-2.5 text-center font-normal">
                    {t.stats.noFocusDay}
                  </p>
                ) : (
                  drilldownSessions.map((session, sIdx) => {
                    const sTime = new Date(session.started_at).toLocaleTimeString(language === "en" ? "en-US" : "id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isSuccess = session.status === "completed";
                    const tagCol = DEFAULT_TAG_COLORS[session.tag || "Fokus"] || "#187557";

                    return (
                      <div
                        key={session.id || sIdx}
                        className="p-3 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isSuccess ? "bg-[#E4F4ED] text-[#187557]" : "bg-red-50 text-red-600"
                            }`}
                          >
                            <TreePine className="w-4 h-4 stroke-[1.8]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: tagCol }}
                              />
                              <span className="text-[12.5px] font-semibold text-[#0D3528]">
                                {translateTag(session.tag || "Fokus")}
                              </span>
                              <span className="text-[10px] text-[#4C7567]">· {sTime}</span>
                            </div>
                            {session.task_note ? (
                              <p className="text-[11px] text-[#4C7567] line-clamp-1 italic mt-0.5">
                                "{session.task_note}"
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#4C7567] mt-0.5">
                                {isSuccess
                                  ? language === "en" ? "Tree grown" : "Pohon tumbuh subur"
                                  : language === "en" ? "Incomplete session" : "Sesi terhenti"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[13px] font-bold text-[#0D3528] tabular-nums">
                            {session.duration_minutes || 25}m
                          </span>
                          <p className={`text-[10px] font-medium ${isSuccess ? "text-[#14664D]" : "text-red-500"}`}>
                            {isSuccess ? t.common.done : t.journal.witheredBadge}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. KARTU PENCAPAIAN (SHARE CARD FLEX BANNER)              */}
          {/* ========================================================= */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4.5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#187557] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13.5px] font-semibold text-[#0D3528] tracking-tight">
                  {t.stats.shareBannerTitle}
                </h4>
                <p className="text-[11px] text-[#4C7567] font-normal truncate">
                  {t.stats.shareBannerDesc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setIsShareOpen(true);
              }}
              className="py-2 px-3.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11.5px] font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2]" />
              <span>{t.stats.createCardBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {isShareOpen && (
        <ShareSnapshotModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </>
  );
}
