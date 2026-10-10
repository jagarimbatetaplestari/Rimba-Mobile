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
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  TreePine,
  Sparkles,
} from "lucide-react";

interface ShareSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawForestBarChart(
  ctx: CanvasRenderingContext2D,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  data: { dateLabel: string; day: number; minutes: number }[],
  aspectRatio: "story" | "portrait" | "square",
) {
  // Container Box
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Top Labels
  ctx.textAlign = "left";
  ctx.fillStyle = "#94A3B8";
  ctx.font = '500 22px "Urbanist", -apple-system, sans-serif';
  ctx.fillText("minute", cardX + 36, cardY + 46);

  ctx.textAlign = "right";
  ctx.font = '600 24px "Urbanist", -apple-system, sans-serif';
  ctx.fillText("Focused Time Distribution", cardX + cardW - 36, cardY + 46);

  // Chart bounds
  const chartLeft = cardX + 88;
  const chartRight = cardX + cardW - 36;
  const chartTop = cardY + 86;
  const chartBottom = cardY + cardH - (aspectRatio === "square" ? 44 : 54);
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  // Max value calculation
  const rawMax = Math.max(60, ...data.map((d) => d.minutes));
  const step = rawMax > 280 ? 70 : rawMax > 140 ? 50 : rawMax > 60 ? 30 : 15;
  const yTicksCount = 5;
  const gridMax = Math.ceil(rawMax / (step * (yTicksCount - 1))) * step * (yTicksCount - 1) || 120;

  // Horizontal Gridlines & Y-Axis Labels
  ctx.textAlign = "right";
  ctx.font = '500 19px "Urbanist", sans-serif';
  ctx.fillStyle = "#94A3B8";

  for (let i = 0; i < yTicksCount; i++) {
    const val = Math.round((gridMax / (yTicksCount - 1)) * i);
    const yPos = chartBottom - (i / (yTicksCount - 1)) * chartHeight;

    ctx.fillText(`${val}`, chartLeft - 16, yPos + 6);

    ctx.beginPath();
    ctx.moveTo(chartLeft, yPos);
    ctx.lineTo(chartRight, yPos);
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw Bars
  const nBars = data.length;
  if (nBars > 0) {
    const slotWidth = chartWidth / nBars;
    const barWidth = Math.max(6, Math.min(20, slotWidth * 0.65));

    data.forEach((item, idx) => {
      const barH = (item.minutes / gridMax) * chartHeight;
      const x = chartLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
      const y = chartBottom - barH;

      if (item.minutes > 0) {
        ctx.fillStyle = "#63A393"; // Forest rimba sage
        drawRoundedRect(ctx, x, y, barWidth, barH, 4);
        ctx.fill();
      }

      // X-Axis Date Labels (first, last, and every ~7 days)
      if (idx === 0 || idx % 7 === 0 || idx === nBars - 1) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#94A3B8";
        ctx.font = '500 18px "Urbanist", sans-serif';
        ctx.fillText(item.dateLabel, x + barWidth / 2, chartBottom + 30);
      }
    });
  }
}

export function ShareSnapshotModal({
  isOpen,
  onClose,
}: ShareSnapshotModalProps) {
  const { t, language } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const sessions = useGameStore((state) => state.saveData.focus_sessions || []);
  const worldObjects = useGameStore((state) => state.saveData.world_objects || []);
  const notify = useGameStore((state) => state.notify);

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [cardTheme, setCardTheme] = useState<"diorama" | "story">("diorama");
  const [aspectRatio, setAspectRatio] = useState<"story" | "portrait" | "square">("story");
  const [periodScope, setPeriodScope] = useState<"month" | "week" | "all">("month");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  // Trees and Stumps count
  const { treesCount, stumpsCount, faunaCount } = useMemo(() => {
    let trees = 0;
    let stumps = 0;
    worldObjects.forEach((o) => {
      if (o.status === "reclaimed") {
        stumps += 1;
      } else if (o.object_type === "tree" && o.status === "active") {
        trees += 1;
      }
    });
    return { treesCount: trees, stumpsCount: stumps, faunaCount: 2 };
  }, [worldObjects]);

  // Period Analytics
  const periodStats = useMemo(() => {
    const p = periodScope === "month" ? "month" : periodScope === "week" ? "week" : "year";
    return calculatePeriodAnalytics(sessions, p, 0, new Date(), language);
  }, [sessions, periodScope, language]);

  // Highest Unlocked Story Chapter Art (Clean illustration without baked text)
  const highestUnlockedStory = useMemo(() => {
    for (let i = STORY_CHAPTERS.length - 1; i >= 0; i--) {
      if (STORY_CHAPTERS[i].checkUnlocked(saveData).isUnlocked) {
        return STORY_CHAPTERS[i];
      }
    }
    return STORY_CHAPTERS[0];
  }, [saveData]);

  // Date range formatted like Forest (e.g. 09.01 — 09.30 2026)
  const forestDateText = useMemo(() => {
    const s = periodStats.periodStart;
    const e = periodStats.periodEnd;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const sStr = `${pad(s.getMonth() + 1)}.${pad(s.getDate())}`;
    const eStr = `${pad(e.getMonth() + 1)}.${pad(e.getDate())}`;
    const yr = e.getFullYear();
    return `${sStr} — ${eStr} ${yr}`;
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

  // Daily focus distribution for bar chart
  const dailyFocusDistribution = useMemo(() => {
    const start = new Date(periodStats.periodStart);
    const end = new Date(periodStats.periodEnd);
    const diffDays = Math.max(
      7,
      Math.min(31, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    );
    const dailyMins = new Array(diffDays).fill(0);

    periodStats.filteredSessions.forEach((s) => {
      if (s.status === "completed") {
        const d = new Date(s.started_at);
        const dayIdx = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIdx >= 0 && dayIdx < diffDays) {
          dailyMins[dayIdx] += s.duration_minutes || 25;
        }
      }
    });

    return dailyMins.map((minutes, idx) => {
      const d = new Date(start.getTime() + idx * (1000 * 60 * 60 * 24));
      return {
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        day: d.getDate(),
        month: d.getMonth() + 1,
        minutes,
      };
    });
  }, [periodStats.periodStart, periodStats.periodEnd, periodStats.filteredSessions]);

  // Total Hours
  const totalHoursNum = useMemo(() => {
    const mins = periodStats.totalMinutes > 0 ? periodStats.totalMinutes : analytics.todayMinutes;
    return Math.round((mins / 60) * 10) / 10;
  }, [periodStats.totalMinutes, analytics.todayMinutes]);

  const regionalBonusHours = useMemo(() => {
    return Math.max(2, Math.round(totalHoursNum * 0.45));
  }, [totalHoursNum]);

  // Capture Canvas WebGL snapshot
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const canvasEl = document.querySelector("canvas");
      if (canvasEl) {
        try {
          const dataUrl = canvasEl.toDataURL("image/png");
          setSnapshotUrl(dataUrl);
        } catch {
          console.warn("Canvas export tainted or unavailable");
        }
      }
    }, 150);
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

    if (cardTheme === "diorama") {
      // =====================================================================
      // STYLE 1: 3D DIORAMA LAND CAPTURE (Exact Forest App Style)
      // =====================================================================
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, width, height);

      // Top Left: Date Range & Total Focused Time
      ctx.textAlign = "left";
      ctx.fillStyle = "#0F172A";
      ctx.font = '700 44px "Urbanist", -apple-system, sans-serif';
      const topY = aspectRatio === "story" ? 130 : aspectRatio === "portrait" ? 105 : 90;
      ctx.fillText(forestDateText, 72, topY);

      ctx.fillStyle = "#64748B";
      ctx.font = '500 24px "Urbanist", sans-serif';
      ctx.fillText("Total Focused Time", 72, topY + 44);

      // Top Right: Counters & Big Hours
      ctx.textAlign = "right";
      ctx.fillStyle = "#64748B";
      ctx.font = '600 26px "Urbanist", sans-serif';
      ctx.fillText(`🌲 ${treesCount}   🥀 ${stumpsCount}`, width - 72, topY);

      ctx.fillStyle = "#0F172A";
      ctx.font = '800 68px "Urbanist", sans-serif';
      ctx.fillText(`${totalHoursNum}`, width - 72, topY + 68);

      ctx.fillStyle = "#64748B";
      ctx.font = '600 24px "Urbanist", sans-serif';
      ctx.fillText("hours", width - 72, topY + 104);

      // Floating 3D Island (NO border, NO card container, exactly like Forest!)
      const imgSize = aspectRatio === "story" ? 820 : aspectRatio === "portrait" ? 640 : 490;
      const imgX = (width - imgSize) / 2;
      const imgY = aspectRatio === "story" ? 280 : aspectRatio === "portrait" ? 210 : 170;

      if (snapshotUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const cropDim = Math.min(img.width, img.height);
            const sx = (img.width - cropDim) / 2;
            const sy = (img.height - cropDim) / 2;
            ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
            resolve();
          };
          img.src = snapshotUrl;
        });
      }

      // Bottom Card: Focused Time Distribution (Bar Chart)
      const cardW = 936;
      const cardH = aspectRatio === "story" ? 560 : aspectRatio === "portrait" ? 430 : 340;
      const cardX = (width - cardW) / 2;
      const cardY = imgY + imgSize + (aspectRatio === "story" ? 50 : 30);

      drawForestBarChart(ctx, cardX, cardY, cardW, cardH, dailyFocusDistribution, aspectRatio);

      // Minimalist Brand Footer (Icon + "Rimba")
      ctx.textAlign = "center";
      ctx.fillStyle = "#94A3B8";
      ctx.font = '600 24px "Urbanist", sans-serif';
      ctx.fillText("🌱  Rimba", width / 2, height - 36);

    } else {
      // =====================================================================
      // STYLE 2: STORY ARTWORK CARD (White Background, Clean Poster & Typography)
      // =====================================================================
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Top Hero Story Artwork Card
      const imgW = width - 120;
      const imgH = aspectRatio === "story" ? 1040 : aspectRatio === "portrait" ? 740 : 540;
      const imgX = 60;
      const imgY = 60;

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          drawRoundedRect(ctx, imgX, imgY, imgW, imgH, 44);
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgW, imgH);

          // Deep bottom gradient for typography contrast
          const ovGrad = ctx.createLinearGradient(0, imgY + imgH * 0.45, 0, imgY + imgH);
          ovGrad.addColorStop(0, "rgba(0,0,0,0)");
          ovGrad.addColorStop(1, "rgba(0,0,0,0.92)");
          ctx.fillStyle = ovGrad;
          ctx.fillRect(imgX, imgY, imgW, imgH);
          ctx.restore();

          // Floating Typography on Artwork
          ctx.textAlign = "center";
          ctx.fillStyle = "#6EE7B7";
          ctx.font = '700 28px "Urbanist", sans-serif';
          ctx.fillText("TOTAL FOCUS TIME", width / 2, imgY + imgH - 170);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = '800 84px "Urbanist", sans-serif';
          ctx.fillText(
            totalHoursNum >= 1 ? `${totalHoursNum} Hours` : `${periodStats.totalMinutes} Minutes`,
            width / 2,
            imgY + imgH - 85,
          );

          ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
          ctx.font = '500 24px "Urbanist", sans-serif';
          const compareText =
            language === "en"
              ? `Your total focus was ${regionalBonusHours} hours more than average of others in your region! Amazing!`
              : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga suaka lainnya! Luar biasa!`;
          ctx.fillText(compareText, width / 2, imgY + imgH - 30);

          resolve();
        };
        img.src = highestUnlockedStory.image;
      });

      // Lower Section on White Background: Focus Type & Archetype
      const lowerY = imgY + imgH + (aspectRatio === "story" ? 70 : 45);
      ctx.textAlign = "left";
      ctx.fillStyle = "#0F172A";
      ctx.font = '800 46px "Urbanist", sans-serif';
      ctx.fillText("Focus Type", 80, lowerY);

      ctx.fillStyle = "#475569";
      ctx.font = '500 25px "Urbanist", sans-serif';
      ctx.fillText(
        "You are an Evergreen. You have the ability to stay focused throughout",
        80,
        lowerY + 52,
      );
      ctx.fillText(
        "the day no matter if it is the sun or moon hanging in the sky!",
        80,
        lowerY + 92,
      );

      // Highlights Row
      ctx.fillStyle = "#047857";
      ctx.font = '700 26px "Urbanist", sans-serif';
      ctx.fillText(`Hari Terfokus: ${mostFocusedDay}`, 80, lowerY + 160);

      ctx.textAlign = "right";
      ctx.fillText(`Jam Emas: ${circadianData.peakWindowLabel || "10:00 – 12:00"}`, width - 80, lowerY + 160);

      // Minimalist Brand Footer (Icon + "Rimba")
      ctx.textAlign = "center";
      ctx.fillStyle = "#94A3B8";
      ctx.font = '600 24px "Urbanist", sans-serif';
      ctx.fillText("🌱  Rimba", width / 2, height - 36);
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
      await shareOrSaveImage({
        title: "Rimba Sanctuary Card",
        text: "Share your mindful forest!",
        dataUrl,
        fileName: `rimba_${cardTheme}_${aspectRatio}_${Date.now()}.png`,
      });
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
      await shareOrSaveImage({
        title: "Rimba Sanctuary Card",
        text: "Save image to photos",
        dataUrl,
        fileName: `rimba_${cardTheme}_${aspectRatio}_${Date.now()}.png`,
      });
      hapticSuccess();
      notify(
        language === "en" ? "Image saved to your library!" : "Gambar tersimpan ke galeri!",
        "success"
      );
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
    const summaryText =
      cardTheme === "diorama"
        ? `🌿 Rimba Diorama · ${forestDateText}\n⏱️ ${totalHoursNum} Jam Fokus · 🌲 ${treesCount} Flora · 🥀 ${stumpsCount} Layu\n🔥 ${analytics.currentStreak} Hari Beruntun · rimba.app`
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
              {cardTheme === "diorama" ? "Forest Style" : "Story Wrapped"}
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

        {/* 1. Card Style Selector (Diorama vs Story) */}
        <div className="rounded-full p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("diorama");
            }}
            className={`py-1.5 px-3 rounded-full text-[11.5px] transition-all cursor-pointer ${
              cardTheme === "diorama"
                ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            🌿 3D Land Capture
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("story");
            }}
            className={`py-1.5 px-3 rounded-full text-[11.5px] transition-all cursor-pointer ${
              cardTheme === "story"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            ✨ Story Artwork
          </button>
        </div>

        {/* 2. Format & Scope Controls Row */}
        <div className="flex items-center justify-between gap-1.5">
          {/* 3 Aspect Ratios: 9:16 | 4:5 | 1:1 */}
          <div className="rounded-full p-0.5 border border-[#0D3528]/8 bg-[#0D3528]/5 flex gap-1">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setAspectRatio("story");
              }}
              className={`py-1 px-2.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                aspectRatio === "story"
                  ? "bg-white text-[#0D3528] shadow-2xs font-semibold"
                  : "text-[#4C7567] font-medium"
              }`}
            >
              9:16
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setAspectRatio("portrait");
              }}
              className={`py-1 px-2.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                aspectRatio === "portrait"
                  ? "bg-white text-[#0D3528] shadow-2xs font-semibold"
                  : "text-[#4C7567] font-medium"
              }`}
            >
              4:5
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setAspectRatio("square");
              }}
              className={`py-1 px-2.5 rounded-full text-[10.5px] transition-all cursor-pointer ${
                aspectRatio === "square"
                  ? "bg-white text-[#0D3528] shadow-2xs font-semibold"
                  : "text-[#4C7567] font-medium"
              }`}
            >
              1:1
            </button>
          </div>

          {/* Period Scope */}
          <div className="rounded-full p-0.5 border border-[#0D3528]/8 bg-[#0D3528]/5 flex gap-1">
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
                className={`py-1 px-2 rounded-full text-[10px] transition-all cursor-pointer ${
                  periodScope === s.id
                    ? "bg-[#187557] text-white shadow-2xs font-semibold"
                    : "text-[#4C7567] font-medium"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Live Card Preview */}
        {cardTheme === "diorama" ? (
          /* DIORAMA PREVIEW CARD (Exact Forest App Style) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-slate-200/90 p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md bg-[#F8FAFC] ${
              aspectRatio === "story"
                ? "aspect-[9/15]"
                : aspectRatio === "portrait"
                ? "aspect-[4/5]"
                : "aspect-square"
            }`}
          >
            {/* Top Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-[#0F172A] tracking-tight font-mono">
                  {forestDateText}
                </p>
                <p className="text-[10px] text-[#64748B] font-medium">
                  Total Focused Time
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#64748B]">
                  🌲 {treesCount} &nbsp; 🥀 {stumpsCount}
                </p>
                <p className="text-[20px] font-extrabold text-[#0F172A] leading-tight">
                  {totalHoursNum} <span className="text-[10.5px] font-medium text-[#64748B]">hours</span>
                </p>
              </div>
            </div>

            {/* Floating 3D Island (NO border, NO card container, pure free float) */}
            <div className="w-[78%] mx-auto aspect-square my-auto flex items-center justify-center relative">
              {snapshotUrl ? (
                <img src={snapshotUrl} alt="3D Island" className="w-full h-full object-contain filter drop-shadow-sm" />
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">
                  {t.shareModal.takingSnapshot}
                </span>
              )}
            </div>

            {/* Bottom Card: Focused Time Distribution (Bar Chart) */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[8px] text-[#94A3B8]">
                <span className="font-medium">minute</span>
                <span className="font-semibold">Focused Time Distribution</span>
              </div>

              {/* Minimal SVG Bar Chart */}
              <div className="h-14 w-full flex items-end justify-between gap-1 pt-1 border-b border-slate-100 pb-1">
                {dailyFocusDistribution.slice(-14).map((d, i) => {
                  const maxM = Math.max(60, ...dailyFocusDistribution.map((m) => m.minutes));
                  const heightPct = Math.max(8, (d.minutes / maxM) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div
                        className="w-full rounded-t-xs transition-all"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: d.minutes > 0 ? "#63A393" : "#F1F5F9",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[7px] text-[#94A3B8] font-mono px-0.5">
                <span>{dailyFocusDistribution[0]?.dateLabel}</span>
                <span>{dailyFocusDistribution[Math.floor(dailyFocusDistribution.length / 2)]?.dateLabel}</span>
                <span>{dailyFocusDistribution[dailyFocusDistribution.length - 1]?.dateLabel}</span>
              </div>
            </div>

            {/* Minimal Footer */}
            <div className="text-center pt-0.5">
              <span className="text-[9px] text-[#94A3B8] font-semibold">
                🌱 Rimba
              </span>
            </div>
          </div>
        ) : (
          /* STORY ARTWORK CARD (White Background, Clean Poster & Typography) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-slate-200/90 p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md bg-white ${
              aspectRatio === "story"
                ? "aspect-[9/15]"
                : aspectRatio === "portrait"
                ? "aspect-[4/5]"
                : "aspect-square"
            }`}
          >
            {/* Top Rounded Artwork Poster with Floating Focus Hours */}
            <div className="relative w-full aspect-[9/10] rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <img
                src={highestUnlockedStory.image}
                alt={highestUnlockedStory.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              {/* Floating Typography on Artwork */}
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <p className="text-[10px] font-bold text-[#6EE7B7] uppercase tracking-wider">
                  Total Focus Time
                </p>
                <p className="text-[26px] font-extrabold text-white tracking-tight my-0.5 leading-tight">
                  {totalHoursNum >= 1 ? `${totalHoursNum} Hours` : `${periodStats.totalMinutes} Minutes`}
                </p>
                <p className="text-[8.5px] text-white/90 leading-tight max-w-[240px] mx-auto font-medium">
                  {language === "en"
                    ? `Your total focus was ${regionalBonusHours} hours more than average in your region! Amazing!`
                    : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga lainnya! Luar biasa!`}
                </p>
              </div>
            </div>

            {/* Lower Details on Clean White Background */}
            <div className="py-1 space-y-1">
              <h3 className="text-[13px] font-extrabold text-[#0F172A] leading-tight">
                Focus Type
              </h3>
              <p className="text-[9.5px] text-[#475569] leading-snug">
                You are an Evergreen. You have the ability to stay focused throughout the day no matter if it is the sun or moon hanging in the sky!
              </p>
              <div className="flex items-center justify-between pt-1 text-[9px] font-bold text-[#047857]">
                <span>Hari Terfokus: {mostFocusedDay}</span>
                <span>Jam Emas: {circadianData.peakWindowLabel || "10:00 – 12:00"}</span>
              </div>
            </div>

            {/* Minimal Footer */}
            <div className="text-center pt-0.5">
              <span className="text-[9px] text-[#94A3B8] font-semibold">
                🌱 Rimba
              </span>
            </div>
          </div>
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
