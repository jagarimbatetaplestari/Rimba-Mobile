"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  calculateAnalytics,
  calculatePeriodAnalytics,
  calculateCircadianFocusRhythm,
} from "@/lib/game/analytics";
import { STORY_CHAPTERS } from "@/lib/game/storyLore";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, shareOrSaveImage } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { X, Download, Copy, Check, Share2 } from "lucide-react";
import {
  ShareAspectRatio,
  ShareCardTheme,
  TagStatItem,
  TAG_COLORS,
  DEFAULT_TAG_PALETTE,
  BLUE_GREEN_PALETTE,
  getSpeciesName,
  SPECIES_NAMES,
  SanctuaryShareCard,
  drawSanctuaryCardCanvas,
  DioramaShareCard,
  drawDioramaCardCanvas,
  StoryShareCard,
  drawStoryCardCanvas,
} from "./share-cards";

interface ShareSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSnapshotModal({ isOpen, onClose }: ShareSnapshotModalProps) {
  const { t, language } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const sessions = useGameStore((state) => state.saveData.focus_sessions || []);
  const worldObjects = useGameStore((state) => state.saveData.world_objects || []);
  const notify = useGameStore((state) => state.notify);

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [cardTheme, setCardTheme] = useState<ShareCardTheme>("sanctuary");
  const aspectRatio: ShareAspectRatio = "story"; // Locked to 9:16 Story format
  const [periodScope, setPeriodScope] = useState<"month" | "week" | "all">("month");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  // Favorite / Most planted tree species
  const favoriteTreeSpecies = useMemo(() => {
    const counts: Record<string, number> = {};
    worldObjects.forEach((o) => {
      if (o.object_type === "tree" && o.status === "active" && o.species) {
        counts[o.species] = (counts[o.species] || 0) + 1;
      }
    });
    sessions.forEach((s) => {
      if (s.status === "completed" && s.species) {
        counts[s.species] = (counts[s.species] || 0) + 1;
      }
    });
    let topSpecies = "nordic_pine";
    let maxCount = 0;
    for (const [sp, cnt] of Object.entries(counts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        topSpecies = sp;
      }
    }
    return getSpeciesName(topSpecies, language);
  }, [worldObjects, sessions, language]);

  // Trees and Stumps count
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

  // Period Analytics
  const periodStats = useMemo(() => {
    const p = periodScope === "month" ? "month" : periodScope === "week" ? "week" : "year";
    return calculatePeriodAnalytics(sessions, p, 0, new Date(), language);
  }, [sessions, periodScope, language]);

  // Tag Distribution Stats for Forest App Donut Chart (Strictly Blue & Green Palette)
  const tagStats = useMemo<TagStatItem[]>(() => {
    const dist = periodStats.tagDistribution || analytics.tagDistribution || {};
    const totalMins = Object.values(dist).reduce((a, b) => a + b, 0);
    const entries = Object.entries(dist);
    const isEn = language === "en";

    if (entries.length === 0 || totalMins === 0) {
      return isEn
        ? [
            { name: "Study", minutes: 120, pct: 40, hours: 2.0, color: BLUE_GREEN_PALETTE[0] },
            { name: "Work", minutes: 90, pct: 30, hours: 1.5, color: BLUE_GREEN_PALETTE[1] },
            { name: "Coding", minutes: 60, pct: 20, hours: 1.0, color: BLUE_GREEN_PALETTE[2] },
            { name: "Mindfulness", minutes: 30, pct: 10, hours: 0.5, color: BLUE_GREEN_PALETTE[3] },
          ]
        : [
            { name: "Belajar", minutes: 120, pct: 40, hours: 2.0, color: BLUE_GREEN_PALETTE[0] },
            { name: "Kerja", minutes: 90, pct: 30, hours: 1.5, color: BLUE_GREEN_PALETTE[1] },
            { name: "Koding", minutes: 60, pct: 20, hours: 1.0, color: BLUE_GREEN_PALETTE[2] },
            { name: "Mindfulness", minutes: 30, pct: 10, hours: 0.5, color: BLUE_GREEN_PALETTE[3] },
          ];
    }

    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 6).map(([name, mins], idx) => {
      const pct = Math.max(1, Math.round((mins / totalMins) * 100));
      const hrs = Math.round((mins / 60) * 10) / 10;
      const color = BLUE_GREEN_PALETTE[idx % BLUE_GREEN_PALETTE.length];
      return { name, minutes: mins, pct, hours: hrs, color };
    });
  }, [periodStats.tagDistribution, analytics.tagDistribution, language]);

  // Highest Unlocked Story Chapter Art
  const highestUnlockedStory = useMemo(() => {
    for (let i = STORY_CHAPTERS.length - 1; i >= 0; i--) {
      if (STORY_CHAPTERS[i].checkUnlocked(saveData).isUnlocked) {
        return STORY_CHAPTERS[i];
      }
    }
    return STORY_CHAPTERS[0];
  }, [saveData]);

  // Date range formatted like Forest (e.g. 01.01 ── 12.31 2026)
  const forestDateText = useMemo(() => {
    const s = periodStats.periodStart;
    const e = periodStats.periodEnd;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const sStr = `${pad(s.getMonth() + 1)}.${pad(s.getDate())}`;
    const eStr = `${pad(e.getMonth() + 1)}.${pad(e.getDate())}`;
    const yr = e.getFullYear();
    return `${sStr} ── ${eStr} ${yr}`;
  }, [periodStats.periodStart, periodStats.periodEnd]);

  // Circadian data for period
  const circadianData = useMemo(() => {
    return calculateCircadianFocusRhythm(periodStats.filteredSessions, language);
  }, [periodStats.filteredSessions, language]);

  const mostFocusedDay = useMemo(() => {
    const dayNames =
      language === "en"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const dayCounts = new Array(7).fill(0);
    periodStats.filteredSessions.forEach((s) => {
      if (s.status === "completed") {
        dayCounts[new Date(s.started_at).getDay()] += s.duration_minutes || 25;
      }
    });
    let maxIdx = 0;
    dayCounts.forEach((cnt, idx) => {
      if (cnt > dayCounts[maxIdx]) maxIdx = idx;
    });
    return dayNames[maxIdx];
  }, [periodStats.filteredSessions, language]);

  // Total Hours
  const totalHoursNum = useMemo(() => {
    const mins = periodStats.totalMinutes > 0 ? periodStats.totalMinutes : analytics.todayMinutes;
    return Math.round((mins / 60) * 10) / 10;
  }, [periodStats.totalMinutes, analytics.todayMinutes]);

  const regionalBonusHours = useMemo(() => {
    return Math.max(2, Math.round(totalHoursNum * 0.45));
  }, [totalHoursNum]);

function cropIslandFromCanvas(canvasEl: HTMLCanvasElement): string {
  try {
    const w = canvasEl.width;
    const h = canvasEl.height;
    if (w === 0 || h === 0) return canvasEl.toDataURL("image/png");

    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    const tempCtx = temp.getContext("2d");
    if (!tempCtx) return canvasEl.toDataURL("image/png");

    tempCtx.drawImage(canvasEl, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    let found = false;

    // Scan every 4th pixel for speed
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        // Island pixels have opacity > 25
        if (alpha > 25) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (found && maxX > minX && maxY > minY) {
      const islandW = maxX - minX;
      const islandH = maxY - minY;
      // Add comfortable 5% margin around the island
      const pad = Math.round(Math.max(islandW, islandH) * 0.05);
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, islandW + pad * 2);
      const cropH = Math.min(h - cropY, islandH + pad * 2);

      const out = document.createElement("canvas");
      out.width = cropW;
      out.height = cropH;
      const outCtx = out.getContext("2d");
      if (outCtx) {
        outCtx.drawImage(temp, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        return out.toDataURL("image/png");
      }
    }
  } catch (err) {
    console.warn("Auto-crop bounding box failed, falling back to center crop:", err);
  }

  // Fallback: Center crop
  try {
    const w = canvasEl.width;
    const h = canvasEl.height;
    const size = Math.round(Math.min(w * 0.95, h * 0.65));
    const cx = w / 2;
    const cy = h * 0.46;
    const cropX = Math.max(0, cx - size / 2);
    const cropY = Math.max(0, cy - size / 2);

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const outCtx = out.getContext("2d");
    if (outCtx) {
      outCtx.drawImage(canvasEl, cropX, cropY, size, size, 0, 0, size, size);
      return out.toDataURL("image/png");
    }
  } catch {
    // ignore
  }

  return canvasEl.toDataURL("image/png");
}

  // Capture Canvas WebGL snapshot with default isometric framing & tight bounding box
  useEffect(() => {
    if (!isOpen) return;

    // 1. Immediately snap camera to standard default isometric perspective
    window.dispatchEvent(new CustomEvent("rimba:camera", { detail: "snap_reset" }));

    // 2. Allow render frame to complete, then capture and tight-crop the island
    const timer = setTimeout(() => {
      const canvasEl = document.querySelector("canvas");
      if (canvasEl) {
        try {
          const dataUrl = cropIslandFromCanvas(canvasEl);
          setSnapshotUrl(dataUrl);
        } catch {
          console.warn("Canvas export tainted or unavailable");
        }
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keyboard Escape
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

  // Generate Composite Canvas Image in 3 Resolutions (1080x1920, 1080x1350, 1080x1080)
  const generateCompositeImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height =
      aspectRatio === "story" ? 1920 : aspectRatio === "portrait" ? 1350 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    try {
      await document.fonts?.ready;
    } catch {
      // fallback if fonts API unavailable
    }

    if (cardTheme === "sanctuary") {
      await drawSanctuaryCardCanvas(ctx, {
        width,
        height,
        aspectRatio,
        language,
        favoriteTreeSpecies,
        totalHoursNum,
        totalMinutes: periodStats.totalMinutes,
        regionalBonusHours,
        mostFocusedDay,
        peakWindowLabel: circadianData.peakWindowLabel,
      });
    } else if (cardTheme === "diorama") {
      await drawDioramaCardCanvas(ctx, {
        width,
        height,
        aspectRatio,
        forestDateText,
        treesCount,
        stumpsCount,
        completedSessionsCount: periodStats.completedCount || treesCount,
        mostFocusedDay,
        peakWindowLabel: circadianData.peakWindowLabel,
        totalHoursNum,
        snapshotUrl,
        tagStats,
        language,
      });
    } else {
      await drawStoryCardCanvas(ctx, {
        width,
        height,
        aspectRatio,
        language,
        story: highestUnlockedStory,
        totalHoursNum,
        totalMinutes: periodStats.totalMinutes,
        regionalBonusHours,
        mostFocusedDay,
        peakWindowLabel: circadianData.peakWindowLabel,
      });
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleShare = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    try {
      const blob = await generateCompositeImage();
      if (!blob) throw new Error("Failed to generate image");
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const success = await shareOrSaveImage({
        title: "Rimba Sanctuary Card",
        text: "Share your mindful forest!",
        dataUrl,
        fileName: `rimba_${cardTheme}_${aspectRatio}_${Date.now()}.png`,
      });
      if (success) {
        hapticSuccess();
      }
    } catch (err) {
      console.error("Share error:", err);
      notify(
        language === "en" ? "Could not share image." : "Gagal memproses gambar.",
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    try {
      const blob = await generateCompositeImage();
      if (!blob) throw new Error("Failed to generate image");
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const success = await shareOrSaveImage({
        title: "Rimba Sanctuary Card",
        text: "Save image to photos",
        dataUrl,
        fileName: `rimba_${cardTheme}_${aspectRatio}_${Date.now()}.png`,
      });
      if (success) {
        soundManager.playComplete();
        hapticSuccess();
        notify(
          language === "en" ? "Image saved to your library!" : "Gambar tersimpan ke galeri!",
          "success"
        );
      }
    } catch (err) {
      console.error("Download error:", err);
      notify(
        language === "en" ? "Could not save image." : "Gagal menyimpan gambar.",
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    soundManager.playPop();
    hapticLight();
    const isEn = language === "en";
    const summaryText =
      cardTheme === "sanctuary"
        ? isEn
          ? `🌲 Rimba Sanctuary Year in Review · 2026\n⏱️ ${totalHoursNum} Focus Hours (+${regionalBonusHours}h vs Region Avg)\n🌿 Favorite Tree: ${favoriteTreeSpecies} · Top Day: ${mostFocusedDay}\nrimba.app`
          : `🌲 Rimba Sanctuary Kilas Balik · 2026\n⏱️ ${totalHoursNum} Jam Fokus (+${regionalBonusHours}h vs Rata-rata)\n🌿 Pohon Terfavorit: ${favoriteTreeSpecies} · Hari Terfokus: ${mostFocusedDay}\nrimba.app`
        : cardTheme === "diorama"
        ? isEn
          ? `🌿 Rimba Diorama · ${forestDateText}\n⏱️ ${totalHoursNum} Focus Hours · 🌲 ${treesCount} Flora · 🥀 ${stumpsCount} Withered\n🔥 ${analytics.currentStreak}-Day Streak · rimba.app`
          : `🌿 Rimba Diorama · ${forestDateText}\n⏱️ ${totalHoursNum} Jam Fokus · 🌲 ${treesCount} Flora · 🥀 ${stumpsCount} Layu\n🔥 ${analytics.currentStreak} Hari Beruntun · rimba.app`
        : isEn
        ? `✨ Rimba Focus Story · ${highestUnlockedStory.title}\n⏱️ ${totalHoursNum} Focus Hours (+${regionalBonusHours}h vs Region Avg)\n🌲 ${treesCount} Trees · 🔥 ${analytics.currentStreak}-Day Streak · rimba.app`
        : `✨ Rimba Focus Story · ${highestUnlockedStory.title}\n⏱️ ${totalHoursNum} Jam Fokus (+${regionalBonusHours}h vs Rata-rata)\n🌲 ${treesCount} Pohon · 🔥 ${analytics.currentStreak} Hari Beruntun · rimba.app`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setIsCopied(true);
        hapticSuccess();
        setTimeout(() => setIsCopied(false), 2000);
        notify(t.shareModal.copied, "success");
      }
    } catch {
      console.warn("Clipboard copy unavailable");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[115] flex items-center justify-center p-3 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[410px] max-h-[94vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/80 bg-white p-4 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#0D3528]">
              {t.shareModal.title}
            </h2>
            <span className="text-[11.5px] font-medium text-[#4C7567]">
              {cardTheme === "sanctuary"
                ? "Sanctuary Review"
                : cardTheme === "diorama"
                ? "3D Diorama"
                : "Story Lore"}
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

        {/* 1. Card Style Selector (3 Tabs: Sanctuary Review vs Diorama vs Story) */}
        <div className="rounded-2xl p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("sanctuary");
            }}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] transition-all cursor-pointer text-center font-medium ${
              cardTheme === "sanctuary"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528]"
            }`}
          >
            🌿 Sanctuary
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("diorama");
            }}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] transition-all cursor-pointer text-center font-medium ${
              cardTheme === "diorama"
                ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528]"
            }`}
          >
            🏔️ Diorama
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("story");
            }}
            className={`py-1.5 px-1.5 rounded-xl text-[11px] transition-all cursor-pointer text-center font-medium ${
              cardTheme === "story"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528]"
            }`}
          >
            ✨ Story
          </button>
        </div>

        {/* 2. Format & Scope Controls Row */}
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          {/* Format Badge: Story 9:16 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#187557]/10 border border-[#187557]/20 text-[#187557] text-[10.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#187557]" />
            <span>Story 9:16</span>
          </div>

          {/* Period Scope Pills */}
          <div className="rounded-full p-0.5 border border-[#0D3528]/10 bg-[#0D3528]/5 flex gap-0.5">
            {(
              [
                { id: "month", label: t.shareModal.scopeMonth },
                { id: "week", label: t.shareModal.scopeWeek },
                { id: "all", label: t.shareModal.scopeAll },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setPeriodScope(s.id);
                }}
                className={`py-1 px-2.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                  periodScope === s.id
                    ? "bg-[#187557] text-white shadow-2xs font-semibold"
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Live Card Preview (Modularized Components) */}
        {cardTheme === "sanctuary" ? (
          <SanctuaryShareCard
            aspectRatio={aspectRatio}
            language={language}
            favoriteTreeSpecies={favoriteTreeSpecies}
            totalHoursNum={totalHoursNum}
            totalMinutes={periodStats.totalMinutes}
            regionalBonusHours={regionalBonusHours}
            mostFocusedDay={mostFocusedDay}
            peakWindowLabel={circadianData.peakWindowLabel}
          />
        ) : cardTheme === "diorama" ? (
          <DioramaShareCard
            aspectRatio={aspectRatio}
            forestDateText={forestDateText}
            treesCount={treesCount}
            stumpsCount={stumpsCount}
            completedSessionsCount={periodStats.completedCount || treesCount}
            mostFocusedDay={mostFocusedDay}
            peakWindowLabel={circadianData.peakWindowLabel}
            totalHoursNum={totalHoursNum}
            snapshotUrl={snapshotUrl}
            tagStats={tagStats}
            takingSnapshotText={t.shareModal.takingSnapshot}
            language={language}
          />
        ) : (
          <StoryShareCard
            aspectRatio={aspectRatio}
            language={language}
            story={highestUnlockedStory}
            totalHoursNum={totalHoursNum}
            totalMinutes={periodStats.totalMinutes}
            regionalBonusHours={regionalBonusHours}
            mostFocusedDay={mostFocusedDay}
            peakWindowLabel={circadianData.peakWindowLabel}
          />
        )}

        {/* 4. Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#187557] to-[#125D44] text-white font-semibold text-[13px] shadow-md shadow-[#187557]/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="inline-block animate-spin mr-1">⏳</span>
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{t.shareModal.downloadImage}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] font-medium text-[11.5px] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-[#187557]" />
              <span>{t.shareModal.shareStatus}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] font-medium text-[11.5px] transition-all active:scale-[0.98] cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">{t.shareModal.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#4C7567]" />
                  <span>{t.shareModal.copyText}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
