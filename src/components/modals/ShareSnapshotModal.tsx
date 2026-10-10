"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  calculateAnalytics,
  calculatePeriodAnalytics,
  calculateCircadianFocusRhythm,
  calculateFlowMastery,
  getStreakMilestone,
} from "@/lib/game/analytics";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, shareOrSaveImage } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import {
  X,
  Download,
  Copy,
  Flame,
  Check,
  Share2,
  TreePine,
  Sparkles,
  PieChart,
} from "lucide-react";

interface ShareSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAG_PALETTE: Record<string, string> = {
  Fokus: "#5AC487",
  Kerja: "#3B82F6",
  Belajar: "#F59E0B",
  Buku: "#8B5CF6",
  Riset: "#06B6D4",
  Kreatif: "#EC4899",
  Santai: "#10B981",
};

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

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function drawDonutChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  holeRadius: number,
  slices: { percent: number; color: string }[],
) {
  if (slices.length === 0 || slices.every((s) => s.percent === 0)) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.arc(cx, cy, holeRadius, Math.PI * 2, 0, true);
    ctx.fillStyle = "#E2E8F0";
    ctx.fill();
    return;
  }
  let currentAngle = -Math.PI / 2;
  slices.forEach((slice) => {
    if (slice.percent <= 0) return;
    const sliceAngle = (slice.percent / 100) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(cx, cy, holeRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    currentAngle += sliceAngle;
  });
}

export function ShareSnapshotModal({
  isOpen,
  onClose,
}: ShareSnapshotModalProps) {
  const { t, language } = useTranslation();
  const sessions = useGameStore((state) => state.saveData.focus_sessions || []);
  const worldObjects = useGameStore((state) => state.saveData.world_objects || []);
  const notify = useGameStore((state) => state.notify);

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [cardTheme, setCardTheme] = useState<"diorama" | "wrapped">("diorama");
  const [aspectRatio, setAspectRatio] = useState<"story" | "square">("story");
  const [periodScope, setPeriodScope] = useState<"month" | "week" | "all">("month");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Global Analytics
  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);

  // Trees and Withered Stumps
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

  // Circadian data for period
  const circadianData = useMemo(() => {
    return calculateCircadianFocusRhythm(periodStats.filteredSessions, language);
  }, [periodStats.filteredSessions, language]);

  // Flow mastery
  const flowMastery = useMemo(() => {
    return calculateFlowMastery(sessions, stumpsCount);
  }, [sessions, stumpsCount]);

  // Tag distribution breakdown
  const tagBreakdown = useMemo(() => {
    const dist =
      Object.keys(periodStats.tagDistribution).length > 0
        ? periodStats.tagDistribution
        : analytics.tagDistribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    return Object.entries(dist)
      .map(([label, minutes]) => ({
        id: label,
        label,
        minutes,
        hours: Math.round((minutes / 60) * 10) / 10,
        percent: total > 0 ? Math.round((minutes / total) * 100) : 0,
        color: TAG_PALETTE[label] || "#5AC487",
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 4);
  }, [periodStats.tagDistribution, analytics.tagDistribution]);

  const dominantPercent = useMemo(() => {
    return tagBreakdown[0]?.percent || 0;
  }, [tagBreakdown]);

  // Total Hours calculation
  const totalHoursNum = useMemo(() => {
    const mins = periodStats.totalMinutes > 0 ? periodStats.totalMinutes : analytics.todayMinutes;
    return Math.round((mins / 60) * 10) / 10;
  }, [periodStats.totalMinutes, analytics.todayMinutes]);

  // Date Range header text formatted like Forest App (e.g. 04.01 — 04.30 2026)
  const dateRangeText = useMemo(() => {
    const s = periodStats.periodStart;
    const e = periodStats.periodEnd;
    const sMonth = String(s.getMonth() + 1).padStart(2, "0");
    const sDay = String(s.getDate()).padStart(2, "0");
    const eMonth = String(e.getMonth() + 1).padStart(2, "0");
    const eDay = String(e.getDate()).padStart(2, "0");
    return `${sMonth}.${sDay} — ${eMonth}.${eDay} ${e.getFullYear()}`;
  }, [periodStats.periodStart, periodStats.periodEnd]);

  // Focus Archetype based on peak circadian window
  const archetype = useMemo(() => {
    const h = circadianData.peakHour;
    if (h >= 4 && h < 10) {
      return {
        title: t.shareModal.archetypeEarly,
        desc: t.shareModal.archetypeEarlyDesc,
        icon: "🌅",
      };
    } else if (h >= 10 && h < 16) {
      return {
        title: t.shareModal.archetypeZenith,
        desc: t.shareModal.archetypeZenithDesc,
        icon: "☀️",
      };
    } else if (h >= 16 && h < 20) {
      return {
        title: t.shareModal.archetypeTwilight,
        desc: t.shareModal.archetypeTwilightDesc,
        icon: "🌆",
      };
    } else if (h >= 20 || (h >= 0 && h < 4)) {
      return {
        title: t.shareModal.archetypeNight,
        desc: t.shareModal.archetypeNightDesc,
        icon: "🌙",
      };
    }
    return {
      title: t.shareModal.archetypeEvergreen,
      desc: t.shareModal.archetypeEvergreenDesc,
      icon: "🌲",
    };
  }, [circadianData.peakHour, t]);

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

  // Generate Composite Canvas Image (1080x1920 or 1080x1080)
  const generateCompositeImage = async (): Promise<Blob | null> => {
    if (!snapshotUrl) return null;

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = aspectRatio === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (cardTheme === "diorama") {
      // =====================================================================
      // STYLE 1: DIORAMA CARD (Forest-style Clean Minimalist Editorial Layout)
      // =====================================================================

      // 1. Clean warm off-white canvas
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#F7F9FB");
      bgGrad.addColorStop(1, "#EDF2F7");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Header Section
      // Top Left: Date Range & Total Focused Time
      ctx.textAlign = "left";
      ctx.fillStyle = "#1E293B";
      ctx.font = '700 44px "Urbanist", -apple-system, sans-serif';
      ctx.fillText(dateRangeText, 72, aspectRatio === "story" ? 140 : 100);

      ctx.fillStyle = "#64748B";
      ctx.font = '500 22px "Urbanist", sans-serif';
      ctx.fillText(
        t.shareModal.totalFocusedTime,
        72,
        aspectRatio === "story" ? 180 : 136,
      );

      // Top Right: Trees count & Total Hours
      ctx.textAlign = "right";
      ctx.fillStyle = "#334155";
      ctx.font = '600 24px "Urbanist", sans-serif';
      ctx.fillText(
        `🌲 ${treesCount}   🥀 ${stumpsCount}`,
        width - 72,
        aspectRatio === "story" ? 140 : 100,
      );

      ctx.fillStyle = "#0F172A";
      ctx.font = '800 52px "Urbanist", sans-serif';
      ctx.fillText(
        `${totalHoursNum}`,
        width - 72,
        aspectRatio === "story" ? 204 : 156,
      );

      ctx.fillStyle = "#64748B";
      ctx.font = '500 20px "Urbanist", sans-serif';
      ctx.fillText(
        t.shareModal.hoursLabel,
        width - 72,
        aspectRatio === "story" ? 234 : 184,
      );

      // 3. Center 3D Island Diorama
      const imgSize = aspectRatio === "story" ? 820 : 540;
      const imgX = (width - imgSize) / 2;
      const imgY = aspectRatio === "story" ? 310 : 200;
      const imgRadius = 36;

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Soft shadow under diorama
          ctx.save();
          ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 20;
          ctx.fillStyle = "#FFFFFF";
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.fill();
          ctx.restore();

          // Clipped diorama image
          ctx.save();
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.clip();
          const cropDim = Math.min(img.width, img.height);
          const sx = (img.width - cropDim) / 2;
          const sy = (img.height - cropDim) / 2;
          ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
          ctx.restore();

          // Subtle clean border
          ctx.save();
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          resolve();
        };
        img.src = snapshotUrl;
      });

      // 4. Bottom Card Container: Donut Chart & Tag Distribution
      const cardW = 936;
      const cardH = aspectRatio === "story" ? 480 : 280;
      const cardX = (width - cardW) / 2;
      const cardY = aspectRatio === "story" ? 1220 : 760;
      const cardRadius = 32;

      // Card Background
      ctx.save();
      ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
      ctx.fill();
      ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Donut Chart on Left
      const donutCx = cardX + (aspectRatio === "story" ? 220 : 160);
      const donutCy = cardY + cardH / 2;
      const donutR = aspectRatio === "story" ? 140 : 90;
      const donutHole = donutR * 0.58;

      drawDonutChart(ctx, donutCx, donutCy, donutR, donutHole, tagBreakdown);

      // Dominant percentage in donut center
      ctx.textAlign = "center";
      ctx.fillStyle = "#0F172A";
      ctx.font = `800 ${aspectRatio === "story" ? 38 : 26}px "Urbanist", sans-serif`;
      ctx.fillText(`${dominantPercent}%`, donutCx, donutCy + (aspectRatio === "story" ? 12 : 8));

      // Tag Distribution Header on Right
      const textStartX = cardX + (aspectRatio === "story" ? 440 : 340);
      const textStartY = cardY + (aspectRatio === "story" ? 90 : 60);

      ctx.textAlign = "left";
      ctx.fillStyle = "#0F172A";
      ctx.font = `700 ${aspectRatio === "story" ? 34 : 24}px "Urbanist", sans-serif`;
      ctx.fillText(t.shareModal.tagDistribution, textStartX, textStartY);

      // Tag Legend Rows
      let rowY = textStartY + (aspectRatio === "story" ? 64 : 44);
      tagBreakdown.forEach((item) => {
        // Color dot
        ctx.beginPath();
        ctx.arc(textStartX + 10, rowY - 6, aspectRatio === "story" ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        // Tag Name
        ctx.fillStyle = "#334155";
        ctx.font = `600 ${aspectRatio === "story" ? 22 : 16}px "Urbanist", sans-serif`;
        ctx.fillText(item.label, textStartX + (aspectRatio === "story" ? 32 : 24), rowY);

        // Percentage
        ctx.textAlign = "right";
        ctx.fillStyle = "#64748B";
        ctx.font = `500 ${aspectRatio === "story" ? 20 : 15}px "Urbanist", sans-serif`;
        ctx.fillText(`${item.percent}%`, cardX + cardW - (aspectRatio === "story" ? 160 : 120), rowY);

        // Hours
        ctx.fillStyle = "#0F172A";
        ctx.font = `700 ${aspectRatio === "story" ? 20 : 15}px "Urbanist", sans-serif`;
        ctx.fillText(`${item.hours} H`, cardX + cardW - (aspectRatio === "story" ? 50 : 35), rowY);

        ctx.textAlign = "left";
        rowY += aspectRatio === "story" ? 54 : 36;
      });

      // 5. Clean Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#94A3B8";
      ctx.font = '600 20px "Urbanist", sans-serif';
      ctx.fillText(
        "🍃   R I M B A   ·   M I N D F U L   3 D   S A N C T U A R Y",
        width / 2,
        height - (aspectRatio === "story" ? 64 : 32),
      );
    } else {
      // =====================================================================
      // STYLE 2: FOCUS WRAPPED (Spotify/Forest Wrapped Editorial Artwork)
      // =====================================================================

      // 1. Deep Botanical Twilight Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#061E16");
      grad.addColorStop(0.35, "#0D3A2C");
      grad.addColorStop(0.7, "#144837");
      grad.addColorStop(1, "#051811");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Radial Glow
      const glow = ctx.createRadialGradient(width / 2, 350, 40, width / 2, 350, 700);
      glow.addColorStop(0, "rgba(90, 196, 135, 0.28)");
      glow.addColorStop(0.6, "rgba(43, 182, 136, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // 2. Header
      ctx.textAlign = "center";
      ctx.fillStyle = "#FDE68A";
      ctx.font = '700 32px "Urbanist", sans-serif';
      ctx.fillText("✨   R I M B A   F O C U S   W R A P P E D", width / 2, aspectRatio === "story" ? 130 : 80);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = '500 20px "Urbanist", sans-serif';
      ctx.fillText(periodStats.periodLabel.toUpperCase(), width / 2, aspectRatio === "story" ? 172 : 115);

      // 3. Hero 3D Diorama Artwork
      const imgSize = aspectRatio === "story" ? 760 : 480;
      const imgX = (width - imgSize) / 2;
      const imgY = aspectRatio === "story" ? 220 : 140;
      const imgRadius = 36;

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 48;
          ctx.shadowOffsetY = 24;
          ctx.fillStyle = "#0B261D";
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.fill();
          ctx.restore();

          ctx.save();
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.clip();
          const cropDim = Math.min(img.width, img.height);
          const sx = (img.width - cropDim) / 2;
          const sy = (img.height - cropDim) / 2;
          ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
          ctx.restore();

          ctx.save();
          drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          resolve();
        };
        img.src = snapshotUrl;
      });

      // 4. Hero Focus Hours Stat
      const heroY = aspectRatio === "story" ? 1040 : 660;
      ctx.fillStyle = "#A7F3D0";
      ctx.font = '600 22px "Urbanist", sans-serif';
      ctx.fillText(t.shareModal.totalFocusedTime.toUpperCase(), width / 2, heroY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${aspectRatio === "story" ? 72 : 54}px "Urbanist", sans-serif`;
      ctx.fillText(
        totalHoursNum >= 1 ? `${totalHoursNum} Hours` : `${periodStats.totalMinutes} Minutes`,
        width / 2,
        heroY + (aspectRatio === "story" ? 76 : 56),
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = '500 20px "Urbanist", sans-serif';
      ctx.fillText(
        language === "en"
          ? `Grew ${periodStats.completedCount} vibrant trees with ${flowMastery.completionRate}% flow purity!`
          : `Menumbuhkan ${periodStats.completedCount} pohon lestari dengan kemurnian fokus ${flowMastery.completionRate}%!`,
        width / 2,
        heroY + (aspectRatio === "story" ? 120 : 90),
      );

      // 5. Archetype Glass Card
      if (aspectRatio === "story") {
        const boxW = 880;
        const boxH = 220;
        const boxX = (width - boxW) / 2;
        const boxY = 1260;

        ctx.save();
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = "left";
        ctx.fillStyle = "#FDE68A";
        ctx.font = '700 28px "Urbanist", sans-serif';
        ctx.fillText(
          `${archetype.icon}  ${archetype.title}`,
          boxX + 40,
          boxY + 55,
        );

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = '500 19px "Urbanist", sans-serif';
        drawWrappedText(ctx, archetype.desc, boxX + 40, boxY + 105, boxW - 80, 28);

        // 6. Highlights Pill Row
        const pillY = 1530;
        const pillW = 880;
        const pillH = 130;
        const pillX = (width - pillW) / 2;

        ctx.save();
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 24);
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        const c1 = pillX + pillW * 0.25;
        const c2 = pillX + pillW * 0.50;
        const c3 = pillX + pillW * 0.75;

        ctx.textAlign = "center";
        ctx.fillStyle = "#A7F3D0";
        ctx.font = '700 26px "Urbanist", sans-serif';
        ctx.fillText(`🔥 ${analytics.currentStreak}d`, c1, pillY + 54);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = '500 16px "Urbanist", sans-serif';
        ctx.fillText(language === "en" ? "Streak" : "Beruntun", c1, pillY + 88);

        ctx.fillStyle = "#A7F3D0";
        ctx.font = '700 26px "Urbanist", sans-serif';
        ctx.fillText(`🌲 ${treesCount}`, c2, pillY + 54);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = '500 16px "Urbanist", sans-serif';
        ctx.fillText(language === "en" ? "Flora" : "Pohon", c2, pillY + 88);

        ctx.fillStyle = "#A7F3D0";
        ctx.font = '700 26px "Urbanist", sans-serif';
        ctx.fillText(`${flowMastery.completionRate}%`, c3, pillY + 54);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = '500 16px "Urbanist", sans-serif';
        ctx.fillText(language === "en" ? "Purity" : "Kemurnian", c3, pillY + 88);
      }

      // 7. Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = '600 19px "Urbanist", sans-serif';
      ctx.fillText(
        "rimba.app  ·  Mindful 3D Sanctuary  ·  Wrapped",
        width / 2,
        height - (aspectRatio === "story" ? 64 : 32),
      );
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
        fileName: `rimba_${cardTheme}_${Date.now()}.png`,
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
        fileName: `rimba_${cardTheme}_${Date.now()}.png`,
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
        ? `🌿 Rimba Diorama · ${dateRangeText}\n⏱️ ${totalHoursNum} Jam Fokus · 🌲 ${treesCount} Pohon Lestari\n🔥 ${analytics.currentStreak} Hari Beruntun · rimba.app`
        : `✨ Rimba Focus Wrapped · ${periodStats.periodLabel}\n⏱️ ${totalHoursNum} Jam Fokus (${flowMastery.completionRate}% Kemurnian)\n${archetype.icon} ${archetype.title}\n🌲 ${treesCount} Flora · 🔥 ${analytics.currentStreak} Hari Beruntun · rimba.app`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setIsCopied(true);
        hapticSuccess();
        setTimeout(() => setIsCopied(false), 2000);
        notify(t.shareModal.copySuccessToast, "success");
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

      <div className="relative z-10 w-full max-w-[390px] max-h-[94vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight text-[#0D3528]">
              {t.shareModal.title}
            </h2>
            <span className="text-[11.5px] font-medium text-[#4C7567]">
              {cardTheme === "diorama" ? t.shareModal.tabDiorama : t.shareModal.tabWrapped}
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

        {/* 1. Card Style Selector (Diorama vs Wrapped) */}
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
            {t.shareModal.tabDiorama}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setCardTheme("wrapped");
            }}
            className={`py-1.5 px-3 rounded-full text-[11.5px] transition-all cursor-pointer ${
              cardTheme === "wrapped"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            {t.shareModal.tabWrapped}
          </button>
        </div>

        {/* 2. Format & Scope Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Aspect Ratio */}
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
          /* DIORAMA PREVIEW CARD (Forest App Style) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 p-3 text-left flex flex-col justify-between transition-all duration-300 shadow-xl bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F6] ${
              aspectRatio === "story" ? "aspect-[9/13]" : "aspect-square"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-[#1E293B] font-mono tracking-tight">
                  {dateRangeText}
                </p>
                <p className="text-[9.5px] font-medium text-[#64748B]">
                  {t.shareModal.totalFocusedTime}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#334155]">
                  🌲 {treesCount} &nbsp; 🥀 {stumpsCount}
                </p>
                <p className="text-[16px] font-extrabold text-[#0F172A] leading-tight">
                  {totalHoursNum} <span className="text-[10px] font-medium text-[#64748B]">{t.shareModal.hoursLabel}</span>
                </p>
              </div>
            </div>

            {/* 3D Island Snapshot */}
            <div className="w-[82%] mx-auto aspect-square rounded-2xl overflow-hidden shadow-md border border-slate-200/80 my-1 bg-white flex items-center justify-center relative">
              {snapshotUrl ? (
                <img src={snapshotUrl} alt="3D Island" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">
                  {t.shareModal.takingSnapshot}
                </span>
              )}
            </div>

            {/* Bottom Donut Card */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
              {/* Donut SVG */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {tagBreakdown.length > 0 && (
                    <path
                      stroke={tagBreakdown[0].color}
                      strokeWidth="4"
                      strokeDasharray={`${dominantPercent}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <span className="absolute text-[9px] font-bold text-[#0F172A]">
                  {dominantPercent}%
                </span>
              </div>

              {/* Tag Breakdown List */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[9.5px] font-bold text-[#0F172A] tracking-tight">
                  {t.shareModal.tagDistribution}
                </p>
                {tagBreakdown.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[8.5px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-[#334155] font-medium truncate">{item.label}</span>
                    </div>
                    <span className="text-[#0F172A] font-bold">{item.hours}H</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-0.5">
              <span className="text-[8.5px] text-[#94A3B8] font-semibold tracking-wider">
                🍃 RIMBA · MINDFUL 3D SANCTUARY
              </span>
            </div>
          </div>
        ) : (
          /* WRAPPED PREVIEW CARD (Spotify/Forest Wrapped Style) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-white/20 p-3.5 text-center flex flex-col justify-between transition-all duration-300 shadow-xl bg-gradient-to-b from-[#061E16] via-[#0E3528] to-[#04160F] text-white ${
              aspectRatio === "story" ? "aspect-[9/13]" : "aspect-square"
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-amber-300 tracking-wider">
                ✨ RIMBA WRAPPED
              </p>
              <p className="text-[9px] text-emerald-200/70 font-medium">
                {periodStats.periodLabel}
              </p>
            </div>

            {/* 3D Island */}
            <div className="w-[72%] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/30 my-1 bg-[#092218] flex items-center justify-center relative">
              {snapshotUrl ? (
                <img src={snapshotUrl} alt="3D Island" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-emerald-100/70 font-normal">
                  {t.shareModal.takingSnapshot}
                </span>
              )}
            </div>

            {/* Hero Stat */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-emerald-200/80 uppercase tracking-wider">
                {t.shareModal.totalFocusedTime}
              </p>
              <p className="text-[24px] font-extrabold text-white leading-tight">
                {totalHoursNum >= 1 ? `${totalHoursNum} Jam` : `${periodStats.totalMinutes}m`}
              </p>
              <p className="text-[9.5px] text-emerald-100/80">
                {periodStats.completedCount} pohon lestari · {flowMastery.completionRate}% kemurnian
              </p>
            </div>

            {/* Archetype Pill */}
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-left">
              <p className="text-[10px] font-bold text-amber-300">
                {archetype.icon} {archetype.title}
              </p>
              <p className="text-[8.5px] text-emerald-100/85 line-clamp-2 leading-tight mt-0.5">
                {archetype.desc}
              </p>
            </div>

            {/* Footer */}
            <div className="text-center">
              <span className="text-[8px] text-emerald-100/50 font-medium tracking-wide">
                rimba.app · Mindful 3D Sanctuary · Wrapped
              </span>
            </div>
          </div>
        )}

        {/* 4. Action Buttons */}
        <div className="space-y-2 pt-0.5">
          <button
            type="button"
            onClick={handleShare}
            disabled={isGenerating}
            className="w-full py-2.5 px-3 rounded-full bg-gradient-to-r from-[#187557] to-[#2BB688] hover:opacity-95 text-white text-[12.5px] font-semibold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[2]" />
            <span>{isGenerating ? t.shareModal.preparingStory : t.shareModal.shareToStory}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isGenerating}
              className="py-2 px-3 rounded-full border border-[#0D3528]/15 bg-white hover:bg-[#E4F4ED]/50 text-[11.5px] font-medium text-[#0D3528] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-[#187557] stroke-[2]" />
              ) : (
                <Copy className="w-3.5 h-3.5 stroke-[1.8]" />
              )}
              <span>{isCopied ? t.shareModal.copied : t.shareModal.copyText}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="py-2 px-3 rounded-full border border-[#0D3528]/15 bg-white hover:bg-[#E4F4ED]/50 text-[11.5px] font-medium text-[#0D3528] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{t.shareModal.downloadImage}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
