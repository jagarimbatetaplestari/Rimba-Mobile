"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  calculateAnalytics,
  calculatePeriodAnalytics,
  toLocalDateString,
  AnalyticsPeriod,
} from "@/lib/game/analytics";
import { getUnlockedTilesSet } from "@/lib/game/worldRules";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";
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
  BarChart3,
} from "lucide-react";

export interface MobileStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TAG_COLORS: Record<string, string> = {
  Fokus: "#1E5638",
  Kerja: "#2A724B",
  Belajar: "#3D8C60",
  Buku: "#529E73",
  Riset: "#6DB28B",
  Kreatif: "#8DC7A5",
  Santai: "#B2DFC5",
};

export function MobileStatisticsModal({
  isOpen,
  onClose,
}: MobileStatisticsModalProps) {
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
    () => calculatePeriodAnalytics(sessions, period, periodOffset),
    [sessions, period, periodOffset],
  );

  const maxBarMinutes = useMemo(() => {
    const max = Math.max(...periodStats.bars.map((b) => b.minutes), 1);
    return max;
  }, [periodStats.bars]);

  // Tag Distribution Breakdown
  const tagBreakdown = useMemo(() => {
    const total = Object.values(analytics.tagDistribution).reduce(
      (a, b) => a + b,
      0,
    );
    return Object.entries(analytics.tagDistribution)
      .map(([label, minutes]) => ({
        id: label,
        label,
        minutes,
        percent: total > 0 ? Math.round((minutes / total) * 100) : 0,
        color: DEFAULT_TAG_COLORS[label] || "#1E5638",
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [analytics.tagDistribution]);

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
          label: current.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          }),
        });

        current.setDate(current.getDate() + 1);
      }
      weeks.push({ days: daysInWeek });
    }
    return weeks;
  }, [analytics.activityMap]);

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased"
      style={{
        background:
          "linear-gradient(180deg, #d4e7dc 0%, #c5dfd1 45%, #b4d3c2 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Top Ambient Light Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 255, 255, 0.5), transparent 70%)",
        }}
      />

      {/* Full Page Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
              Statistik
            </h2>
            <span className="text-[12.5px] font-normal text-[#456b57]">
              Pertumbuhan Suaka
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup statistik"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 1. RINGKASAN UTAMA (BENTO GRID 2-KOLOM SIMETRIS)          */}
        {/* ========================================================= */}
        <div>
          <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
            Ringkasan Suaka
          </p>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            {/* Total Waktu */}
            <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
              <div className="flex items-center justify-between">
                <Clock className="h-4 w-4 text-[#143525] shrink-0" />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#bfdac8]/40 text-[#143525]">
                  Fokus
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[21px] font-semibold tracking-tight text-[#143525] tabular-nums">
                  {totalHours > 0
                    ? `${totalHours}j ${remainingMins}m`
                    : `${remainingMins}m`}
                </p>
                <p className="text-[11px] leading-snug text-[#456b57] mt-0.5">
                  {analytics.totalCompletedSessions} sesi diselesaikan
                </p>
              </div>
            </div>

            {/* Tingkat Sukses */}
            <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-4 w-4 text-[#143525] shrink-0" />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#bfdac8]/40 text-[#143525]">
                  Presisi
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[21px] font-semibold tracking-tight text-[#143525] tabular-nums">
                  {successRate}%
                </p>
                <p className="text-[11px] leading-snug text-[#456b57] mt-0.5">
                  {stumpsCount > 0
                    ? `${stumpsCount} sesi terganggu`
                    : "Disiplin sempurna"}
                </p>
              </div>
            </div>

            {/* Runtutan (Streak) */}
            <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
              <div className="flex items-center justify-between">
                <Flame className="h-4 w-4 text-[#143525] shrink-0" />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d6cbaf]/50 text-[#69572c]">
                  Streak
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[21px] font-semibold tracking-tight text-[#143525] tabular-nums">
                  {analytics.currentStreak} Hari
                </p>
                <p className="text-[11px] leading-snug text-[#456b57] mt-0.5">
                  Rekor: {analytics.longestStreak} hari
                </p>
              </div>
            </div>

            {/* Pohon & Lahan Mekar */}
            <div className="flex flex-col justify-between rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] min-w-0">
              <div className="flex items-center justify-between">
                <TreePine className="h-4 w-4 text-[#143525] shrink-0" />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#bfdac8]/40 text-[#143525]">
                  Flora
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[21px] font-semibold tracking-tight text-[#143525] tabular-nums">
                  {treesCount} Pohon
                </p>
                <p className="text-[11px] leading-snug text-[#456b57] mt-0.5">
                  {unlockedSet.size} petak dibuka
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. AKTIVITAS WAKTU & PERIODE (BAR CHART)                  */}
        {/* ========================================================= */}
        <div>
          <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
            Aktivitas Fokus
          </p>

          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3.5">
            {/* Apple Segmented Control Pill */}
            <div className="p-1 rounded-full bg-[#143525]/8 border border-white/60 grid grid-cols-4 gap-1">
              {(
                [
                  { id: "day", label: "Hari" },
                  { id: "week", label: "Minggu" },
                  { id: "month", label: "Bulan" },
                  { id: "year", label: "Tahun" },
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
                  className={`py-1.5 rounded-full text-[12px] font-semibold tracking-tight transition-all cursor-pointer ${
                    period === tab.id
                      ? "bg-[#1e5638] text-white shadow-2xs"
                      : "text-[#456b57] hover:text-[#143525]"
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
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/90 active:scale-90 text-[#143525] transition-transform cursor-pointer shadow-2xs"
                title="Periode Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.2]" />
              </button>

              <div className="text-center">
                <p className="text-[13.5px] font-semibold text-[#143525]">
                  {periodStats.periodLabel}
                </p>
                <p className="text-[11px] font-normal text-[#456b57]">
                  {periodStats.totalMinutes} Menit ·{" "}
                  {periodStats.completedCount} Sesi
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
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/90 disabled:opacity-25 active:scale-90 text-[#143525] transition-transform cursor-pointer shadow-2xs"
                title="Periode Berikutnya"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Area Visualisasi Bar Chart */}
            <div className="relative pt-6 pb-1">
              {/* Garis Bantu */}
              <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-dashed border-[#143525]/15 w-full" />
                <div className="border-b border-dashed border-[#143525]/15 w-full" />
                <div className="border-b border-dashed border-[#143525]/20 w-full" />
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
                          <span className="text-[9.5px] font-semibold text-[#143525] bg-white border border-white/90 px-1.5 py-0.5 rounded-full shadow-2xs">
                            {bar.minutes}m
                          </span>
                        ) : (
                          <span className="text-[8px] text-[#456b57]/40 font-medium">
                            0
                          </span>
                        )}
                      </div>

                      {/* Bar Kapsul */}
                      <div className="w-full max-w-[20px] flex-1 flex items-end">
                        <div
                          className={`w-full rounded-full transition-all duration-300 ${
                            bar.minutes > 0
                              ? "bg-[#1e5638] shadow-2xs"
                              : "bg-[#143525]/10"
                          } ${
                            isSelected
                              ? "ring-2 ring-[#143525] ring-offset-1 scale-[1.08]"
                              : ""
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {/* Label Sumbu X */}
                      <span
                        className={`text-[10px] truncate mt-2 tracking-tight ${
                          isSelected
                            ? "font-bold text-[#143525]"
                            : "font-medium text-[#456b57]"
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
              <div className="p-2.5 px-3 rounded-[18px] bg-white/60 border border-white/80 shadow-2xs flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#1e5638] shrink-0" />
                <p className="text-[11px] text-[#143525] font-medium tracking-tight leading-tight truncate">
                  {periodStats.peakHeadline}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. DISTRIBUSI KATEGORI (RING DONUT & LIST)                */}
        {/* ========================================================= */}
        <div>
          <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
            Distribusi Kategori
          </p>

          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-[#143525]" />
                <span className="text-[13.5px] font-semibold text-[#143525]">
                  Fokus Sesuai Tag
                </span>
              </div>
              <span className="text-[11px] text-[#456b57] font-medium">
                Semua Waktu
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Donut Chart Ring */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="56"
                    fill="transparent"
                    stroke="#143525"
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
                  <span className="text-[18px] font-bold text-[#143525] leading-none tabular-nums">
                    {analytics.totalFocusMinutes}m
                  </span>
                  <span className="text-[8.5px] uppercase tracking-wider text-[#456b57] font-semibold mt-1">
                    Total
                  </span>
                </div>
              </div>

              {/* Tag Breakdown List */}
              <div className="flex-1 w-full space-y-1.5">
                {tagBreakdown.length === 0 ? (
                  <p className="text-[11.5px] text-[#456b57]/60 italic py-3 text-center">
                    Belum ada sesi fokus tercatat.
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
                        className={`p-2 rounded-[18px] transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white border border-white shadow-2xs"
                            : "hover:bg-white/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-[#143525] text-[12px] truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] shrink-0 font-medium">
                            <span className="text-[#143525]">
                              {item.minutes}m
                            </span>
                            <span className="text-[#456b57]">
                              ({item.percent}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Mini */}
                        <div className="w-full h-1.5 rounded-full bg-[#143525]/8 overflow-hidden mt-1.5">
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
        <div>
          <p className="px-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
            Konsistensi Harian
          </p>

          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#143525]" />
                <span className="text-[13.5px] font-semibold text-[#143525]">
                  Matriks 12 Minggu
                </span>
              </div>
              <span className="text-[11px] text-[#456b57] font-medium">
                84 Hari Terakhir
              </span>
            </div>

            {/* Selected Day Toast */}
            {selectedHeatmapDay && (
              <div className="p-2.5 px-3 rounded-[18px] bg-[#1e5638] text-white text-[11px] font-medium flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
                <span>{selectedHeatmapDay.dateStr}</span>
                <span className="font-semibold">
                  {selectedHeatmapDay.minutes > 0
                    ? `${selectedHeatmapDay.minutes} Menit Fokus`
                    : "Tidak ada fokus"}
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
                      let bgClass = "bg-[#143525]/8 border-transparent";
                      if (minutes > 0 && minutes < 25) {
                        bgClass = "bg-[#bfdac8] border-[#a9c9b4]";
                      } else if (minutes >= 25 && minutes < 60) {
                        bgClass = "bg-[#456b57] border-[#395a49]";
                      } else if (minutes >= 60) {
                        bgClass = "bg-[#1e5638] border-[#143525]";
                      }

                      const isSelected =
                        selectedHeatmapDay?.dateStr === day.dateStr;

                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => {
                            hapticLight();
                            setSelectedHeatmapDay(
                              isSelected
                                ? null
                                : { dateStr: day.label, minutes: day.minutes },
                            );
                          }}
                          className={`aspect-square rounded-[5px] border transition-all duration-150 cursor-pointer hover:scale-115 ${bgClass} ${
                            day.isToday ? "ring-1.5 ring-amber-400" : ""
                          } ${isSelected ? "ring-2 ring-[#143525] scale-120" : ""}`}
                          title={`${day.label}: ${minutes}m`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Intensity Legend */}
            <div className="flex items-center justify-between pt-0.5 text-[10.5px] text-[#456b57] font-medium">
              <span>Kurang</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#143525]/8 border border-white/40" />
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#bfdac8] border border-[#a9c9b4]" />
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#456b57] border border-[#395a49]" />
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#1e5638] border border-[#143525]" />
              </div>
              <span>Banyak</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
