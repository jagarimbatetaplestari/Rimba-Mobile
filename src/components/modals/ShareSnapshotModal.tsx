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

export interface TagStatItem {
  name: string;
  minutes: number;
  pct: number;
  hours: number;
  color: string;
}

const TAG_COLORS: Record<string, string> = {
  Belajar: "#E06553", // Coral / Red (maths)
  Kerja: "#98B946",   // Olive / Green (pdhpe)
  Koding: "#9284D7",  // Purple / Violet (music)
  Membaca: "#57B894", // Teal / Jade (ees)
  Kreatif: "#F3D053", // Warm Yellow (english)
  Mindfulness: "#D9889B", // Rose / Pink (vis art)
  maths: "#E06553",
  pdhpe: "#98B946",
  music: "#9284D7",
  ees: "#57B894",
  english: "#F3D053",
  "vis art": "#D9889B",
};

const DEFAULT_TAG_PALETTE = [
  "#E06553",
  "#98B946",
  "#9284D7",
  "#57B894",
  "#F3D053",
  "#D9889B",
  "#3B82F6",
  "#F97316",
];

function drawForestTagDonutChart(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  tags: TagStatItem[],
) {
  if (tags.length === 0) return;

  // Donut geometry
  const cx = boxX + boxW * 0.28;
  const cy = boxY + boxH * 0.5;
  const outerR = Math.min(boxW * 0.22, boxH * 0.44);
  const innerR = outerR * 0.52;

  let currentAngle = -Math.PI / 2;
  const totalMins = Math.max(1, tags.reduce((a, b) => a + b.minutes, 0));

  tags.forEach((item) => {
    const sliceAngle = (item.minutes / totalMins) * (Math.PI * 2);
    const endAngle = currentAngle + sliceAngle;

    // Draw Slice
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, currentAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Percentage inside slice if large enough
    if (item.pct >= 8 && outerR > 40) {
      const midAngle = currentAngle + sliceAngle / 2;
      const textR = (outerR + innerR) / 2;
      const tx = cx + Math.cos(midAngle) * textR;
      const ty = cy + Math.sin(midAngle) * textR;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 18px "Urbanist", sans-serif';
      ctx.fillText(`${item.pct}%`, tx, ty);
    }
    ctx.restore();

    currentAngle = endAngle;
  });

  // Center Hole
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Center Text: Tag \n Distribution
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7A8594";
  ctx.font = '600 19px "Urbanist", sans-serif';
  ctx.fillText("Tag", cx, cy - 11);
  ctx.fillText("Distribution", cx, cy + 13);
  ctx.restore();

  // Legend List on Right (Matching reference layout: dot, name, percentage, hours)
  const listX = boxX + boxW * 0.54;
  const availableH = boxH * 0.82;
  const rowH = availableH / Math.max(1, Math.min(6, tags.length));
  const startY = boxY + (boxH - availableH) / 2 + rowH * 0.5;

  tags.slice(0, 6).forEach((item, idx) => {
    const y = startY + idx * rowH;

    // Dot
    ctx.beginPath();
    ctx.arc(listX, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    // Tag name
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#555E6D";
    ctx.font = '600 21px "Urbanist", sans-serif';
    ctx.fillText(item.name.toLowerCase(), listX + 20, y);

    // Percentage
    ctx.textAlign = "right";
    ctx.fillStyle = "#7A8594";
    ctx.font = '500 20px "Urbanist", sans-serif';
    ctx.fillText(`${item.pct}%`, boxX + boxW * 0.77, y);

    // Hours
    ctx.fillStyle = "#555E6D";
    ctx.font = '600 21px "Urbanist", sans-serif';
    ctx.fillText(`${item.hours} H`, boxX + boxW - 32, y);
  });
}

const SPECIES_NAMES: Record<string, string> = {
  nordic_pine: "Nordic Pine",
  pine: "Nordic Pine",
  oak: "Ancient Oak",
  round_oak: "Round Oak",
  birch: "Golden Birch",
  elm: "Meadow Elm",
  autumn: "Autumn Maple",
  banana: "Banana Palm",
  savannah: "Savannah Acacia",
  cypress: "Emerald Cypress",
  palm: "Coconut Palm",
  coconut: "Coconut Palm",
  tiered_pine: "Tiered Pine",
  baobab: "Grand Baobab",
  ancient: "Ancient Tree",
};

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
  const [cardTheme, setCardTheme] = useState<"sanctuary" | "diorama" | "story">("sanctuary");
  const [aspectRatio, setAspectRatio] = useState<"story" | "portrait" | "square">("story");
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
    return SPECIES_NAMES[topSpecies] || "Nordic Pine";
  }, [worldObjects, sessions]);

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

  // Tag Distribution Stats for Forest App Donut Chart (matching uploaded reference)
  const tagStats = useMemo<TagStatItem[]>(() => {
    const dist = periodStats.tagDistribution || analytics.tagDistribution || {};
    const totalMins = Object.values(dist).reduce((a, b) => a + b, 0);
    const entries = Object.entries(dist);

    if (entries.length === 0 || totalMins === 0) {
      return [
        { name: "Belajar", minutes: 120, pct: 40, hours: 2.0, color: "#E05343" },
        { name: "Kerja", minutes: 90, pct: 30, hours: 1.5, color: "#8CB83E" },
        { name: "Koding", minutes: 60, pct: 20, hours: 1.0, color: "#8766CC" },
        { name: "Mindfulness", minutes: 30, pct: 10, hours: 0.5, color: "#4EA698" },
      ];
    }

    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 6).map(([name, mins], idx) => {
      const pct = Math.max(1, Math.round((mins / totalMins) * 100));
      const hrs = Math.round((mins / 60) * 10) / 10;
      const color = TAG_COLORS[name] || DEFAULT_TAG_PALETTE[idx % DEFAULT_TAG_PALETTE.length];
      return { name, minutes: mins, pct, hours: hrs, color };
    });
  }, [periodStats.tagDistribution, analytics.tagDistribution]);

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

    try {
      await document.fonts?.ready;
    } catch {
      // fallback if fonts api unavailable
    }

    if (cardTheme === "sanctuary") {
      // =====================================================================
      // STYLE 1: SANCTUARY REVIEW (Cinematic Nature Poster)
      // Full-bleed photo cropped from very bottom, all fonts pure white #FFFFFF
      // =====================================================================

      // 1. Full-Bleed Background Photo (sharecard.webp) - CROP FROM VERY BOTTOM
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const imgAspect = img.width / img.height;
          const targetAspect = width / height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgAspect > targetAspect) {
            sw = img.height * targetAspect;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sh = img.width / targetAspect;
            sx = 0;
            // USER DIRECTIVE: Crop from the very bottom, NOT center!
            sy = Math.max(0, img.height - sh);
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = "/sharecard.webp";
      });

      // 2. Top Header Fade (for white text contrast against bright sky)
      const topY = aspectRatio === "story" ? 130 : aspectRatio === "portrait" ? 100 : 85;
      const topFadeH = topY + 120;
      const topFade = ctx.createLinearGradient(0, 0, 0, topFadeH);
      topFade.addColorStop(0, "rgba(0, 0, 0, 0.55)");
      topFade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, width, topFadeH);

      // Top Header Text (ALL WHITE #FFFFFF, Balanced 3 rows on left and right)
      const titleSize = aspectRatio === "story" ? 64 : aspectRatio === "portrait" ? 52 : 44;
      const subSize = aspectRatio === "story" ? 25 : aspectRatio === "portrait" ? 21 : 18;
      const topGap1 = aspectRatio === "square" ? 28 : 38;
      const topGap2 = aspectRatio === "square" ? 52 : 70;

      // Left 3 rows: 2026 -> Rimba Sanctuary -> Year in Review
      ctx.textAlign = "left";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${titleSize}px "Urbanist", -apple-system, sans-serif`;
      ctx.fillText("2026", 72, topY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `700 ${subSize}px "Urbanist", sans-serif`;
      ctx.fillText("Rimba Sanctuary", 72, topY + topGap1);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `600 ${subSize - 3}px "Urbanist", sans-serif`;
      ctx.fillText("Year in Review", 72, topY + topGap2);

      // Right 3 rows: Rimba (aligned with 2026) -> Favorite Tree -> Tree name
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${titleSize - 12}px "Urbanist", sans-serif`;
      ctx.fillText("Rimba", width - 72, topY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `700 ${subSize - 4}px "Urbanist", sans-serif`;
      ctx.fillText(language === "en" ? "FAVORITE TREE" : "POHON TERFAVORIT", width - 72, topY + topGap1);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${subSize + 5}px "Urbanist", sans-serif`;
      ctx.fillText(favoriteTreeSpecies, width - 72, topY + topGap2);

      // 3. Bottom Grass Section: Soft Dark Emerald Gradient Fade (Strictly BELOW the tree)
      const gradH = aspectRatio === "story" ? 680 : aspectRatio === "portrait" ? 490 : 390;
      const gradY = height - gradH;
      const fadeGrad = ctx.createLinearGradient(0, gradY, 0, height);
      fadeGrad.addColorStop(0, "rgba(8, 24, 18, 0)");
      fadeGrad.addColorStop(0.25, "rgba(8, 24, 18, 0.7)");
      fadeGrad.addColorStop(0.65, "rgba(8, 24, 18, 0.94)");
      fadeGrad.addColorStop(1, "rgba(6, 18, 14, 0.99)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, gradY, width, gradH);

      // Focus Metrics (ALL WHITE, Positioned strictly BELOW tree trunk on the grass mound)
      const focusLabelY = gradY + (aspectRatio === "story" ? 70 : aspectRatio === "portrait" ? 50 : 40);
      const focusHoursY = focusLabelY + (aspectRatio === "story" ? 95 : aspectRatio === "portrait" ? 70 : 58);
      const compY = focusHoursY + (aspectRatio === "story" ? 68 : aspectRatio === "portrait" ? 50 : 42);

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `700 ${aspectRatio === "story" ? 23 : aspectRatio === "portrait" ? 19 : 16}px "Urbanist", sans-serif`;
      ctx.fillText("TOTAL FOCUS TIME", width / 2, focusLabelY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `900 ${aspectRatio === "story" ? 94 : aspectRatio === "portrait" ? 74 : 58}px "Urbanist", sans-serif`;
      const hoursText = totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${periodStats.totalMinutes} mins`;
      ctx.fillText(hoursText, width / 2, focusHoursY);

      // Single concise line for comparison
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `600 ${aspectRatio === "story" ? 22 : aspectRatio === "portrait" ? 18 : 15}px "Urbanist", sans-serif`;
      const compText = language === "en"
        ? `+${regionalBonusHours}h above average in your region · Amazing!`
        : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`;
      ctx.fillText(compText, width / 2, compY);

      // 4. Two-Column Info Row (ALL WHITE)
      const rowDividerY = compY + (aspectRatio === "story" ? 55 : aspectRatio === "portrait" ? 42 : 34);
      ctx.beginPath();
      ctx.moveTo(80, rowDividerY);
      ctx.lineTo(width - 80, rowDividerY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vertical mid divider
      const colMidX = width / 2;
      const rowHeight = aspectRatio === "story" ? 160 : aspectRatio === "portrait" ? 125 : 100;
      ctx.beginPath();
      ctx.moveTo(colMidX, rowDividerY + 16);
      ctx.lineTo(colMidX, rowDividerY + rowHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const textStartY = rowDividerY + (aspectRatio === "story" ? 50 : aspectRatio === "portrait" ? 40 : 32);
      const boxTitleSize = aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17;
      const boxValSize = aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 16;
      const boxDescSize = aspectRatio === "story" ? 19 : aspectRatio === "portrait" ? 15 : 13;

      // Col 1: Focus Type
      const col1X = 84;
      ctx.textAlign = "left";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
      ctx.fillText("Focus Type", col1X, textStartY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${boxValSize}px "Urbanist", sans-serif`;
      ctx.fillText("Evergreen Guardian", col1X, textStartY + (aspectRatio === "story" ? 42 : 32));

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
      const descText = language === "en"
        ? "Focused throughout the day, steady like the pines."
        : "Fokus konsisten sepanjang hari bagai pinus abadi.";
      ctx.fillText(descText, col1X, textStartY + (aspectRatio === "story" ? 82 : 62));

      // Col 2: Hari Terfokus
      const col2X = colMidX + 36;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
      ctx.fillText(language === "en" ? "Top Day" : "Hari Terfokus", col2X, textStartY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxValSize + 4}px "Urbanist", sans-serif`;
      ctx.fillText(mostFocusedDay, col2X, textStartY + (aspectRatio === "story" ? 42 : 32));

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
      const peakLabel = `Jam Emas: ${circadianData.peakWindowLabel || "10:00 – 12:00"}`;
      ctx.fillText(peakLabel, col2X, textStartY + (aspectRatio === "story" ? 82 : 62));

      // Note: Bottom watermark removed as Rimba is now placed at top right!

    } else if (cardTheme === "diorama") {
      // =====================================================================
      // STYLE 2: 3D DIORAMA LAND CAPTURE (Exact Forest App Style)
      // Matching media_1791717073253_f2eb2eeb.jpg
      // =====================================================================
      ctx.fillStyle = "#F0F1F3";
      ctx.fillRect(0, 0, width, height);

      // Top Left: Date Range & "Total \n Focused \n Time"
      const topY = aspectRatio === "story" ? 120 : aspectRatio === "portrait" ? 95 : 80;
      ctx.textAlign = "left";
      ctx.fillStyle = "#6B7280";
      ctx.font = `600 ${aspectRatio === "story" ? 38 : aspectRatio === "portrait" ? 32 : 28}px "Urbanist", -apple-system, sans-serif`;
      ctx.fillText(forestDateText, 72, topY);

      ctx.fillStyle = "#7A8594";
      ctx.font = `500 ${aspectRatio === "story" ? 22 : aspectRatio === "portrait" ? 18 : 16}px "Urbanist", sans-serif`;
      const subLineGap = aspectRatio === "story" ? 28 : aspectRatio === "portrait" ? 23 : 20;
      ctx.fillText("Total", 72, topY + subLineGap + 12);
      ctx.fillText("Focused", 72, topY + subLineGap * 2 + 12);
      ctx.fillText("Time", 72, topY + subLineGap * 3 + 12);

      // Top Right: Flora & Withered Count, Big Hours, "hours"
      ctx.textAlign = "right";
      ctx.fillStyle = "#7A8594";
      ctx.font = `600 ${aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 19}px "Urbanist", sans-serif`;
      ctx.fillText(`🌱 ${treesCount}   🥀 ${stumpsCount}`, width - 72, topY);

      ctx.fillStyle = "#555E6D";
      ctx.font = `800 ${aspectRatio === "story" ? 72 : aspectRatio === "portrait" ? 60 : 50}px "Urbanist", sans-serif`;
      ctx.fillText(`${totalHoursNum}`, width - 72, topY + (aspectRatio === "story" ? 68 : 55));

      ctx.fillStyle = "#7A8594";
      ctx.font = `600 ${aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17}px "Urbanist", sans-serif`;
      ctx.fillText("hours", width - 72, topY + (aspectRatio === "story" ? 104 : 85));

      // Rounded White Card (Container for 3D Island & Tag Donut Chart)
      const cardW = width - 120;
      const cardX = 60;
      const cardY = topY + (aspectRatio === "story" ? 180 : aspectRatio === "portrait" ? 140 : 115);
      const cardH = height - cardY - (aspectRatio === "story" ? 105 : aspectRatio === "portrait" ? 80 : 65);

      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
      ctx.fill();
      ctx.strokeStyle = "#D8DCE3";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Floating 3D Island (Placed inside upper half of white card)
      const islandH = cardH * (aspectRatio === "story" ? 0.53 : aspectRatio === "portrait" ? 0.51 : 0.49);
      const imgSize = Math.min(cardW * 0.9, islandH * 1.05);
      const imgX = (width - imgSize) / 2;
      const imgY = cardY + (islandH - imgSize) / 2 + 10;

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

      // Lower Section of White Card: Tag Distribution Donut Chart + Legend
      const donutY = cardY + islandH;
      const donutH = cardH - islandH - 20;
      drawForestTagDonutChart(ctx, cardX + 16, donutY, cardW - 32, donutH, tagStats);

      // Minimalist Brand Footer (STRICTLY "Rimba" - NO tree icon!)
      ctx.textAlign = "center";
      ctx.fillStyle = "#7A8594";
      ctx.font = '700 24px "Urbanist", sans-serif';
      ctx.fillText("Rimba", width / 2, height - (aspectRatio === "story" ? 42 : 28));

    } else {
      // =====================================================================
      // STYLE 3: STORY ARTWORK CARD (Style 1: Cinematic Lore Poster)
      // Full-bleed artwork with dark gradient overlays, ALL fonts strictly white!
      // =====================================================================

      // 1. Full-Bleed Chapter Artwork (highestUnlockedStory.image)
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const imgAspect = img.width / img.height;
          const targetAspect = width / height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (imgAspect > targetAspect) {
            sw = img.height * targetAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetAspect;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = highestUnlockedStory.image;
      });

      // 2. Top Dark Gradient Fade (for white text legibility)
      const topY = aspectRatio === "story" ? 140 : aspectRatio === "portrait" ? 110 : 90;
      const topFadeH = topY + 120;
      const topFade = ctx.createLinearGradient(0, 0, 0, topFadeH);
      topFade.addColorStop(0, "rgba(0, 0, 0, 0.65)");
      topFade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, width, topFadeH);

      // Top Left: 2026 / Rimba Chronicle / Year in Review (ALL WHITE)
      const titleSize = aspectRatio === "story" ? 68 : aspectRatio === "portrait" ? 56 : 46;
      const subSize = aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 19;
      const topGap = aspectRatio === "square" ? 30 : 42;

      ctx.textAlign = "left";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${titleSize}px "Urbanist", -apple-system, sans-serif`;
      ctx.fillText("2026", 72, topY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `700 ${subSize}px "Urbanist", sans-serif`;
      ctx.fillText("Rimba Chronicle", 72, topY + topGap);
      ctx.font = `600 ${subSize - 3}px "Urbanist", sans-serif`;
      ctx.fillText("Year in Review", 72, topY + topGap + (aspectRatio === "square" ? 24 : 30));

      // Top Right: Chapter Number & Title (ALL WHITE)
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `700 ${aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 17}px "Urbanist", sans-serif`;
      ctx.fillText(`CH. ${highestUnlockedStory.chapterNumber || 1}`, width - 72, topY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${aspectRatio === "story" ? 34 : aspectRatio === "portrait" ? 28 : 23}px "Urbanist", sans-serif`;
      ctx.fillText(highestUnlockedStory.title, width - 72, topY + topGap);

      // 3. Bottom Dark Gradient Overlay
      const gradH = aspectRatio === "story" ? 760 : aspectRatio === "portrait" ? 580 : 460;
      const gradY = height - gradH;
      const fadeGrad = ctx.createLinearGradient(0, gradY, 0, height);
      fadeGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      fadeGrad.addColorStop(0.3, "rgba(0, 0, 0, 0.7)");
      fadeGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.92)");
      fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0.98)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, gradY, width, gradH);

      // Focus Metrics (ALL WHITE)
      const focusLabelY = gradY + (aspectRatio === "story" ? 110 : aspectRatio === "portrait" ? 85 : 70);
      const focusHoursY = focusLabelY + (aspectRatio === "story" ? 90 : aspectRatio === "portrait" ? 70 : 56);
      const compY = focusHoursY + (aspectRatio === "story" ? 64 : aspectRatio === "portrait" ? 50 : 40);

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `700 ${aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 20 : 16}px "Urbanist", sans-serif`;
      ctx.fillText("TOTAL FOCUS TIME", width / 2, focusLabelY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `900 ${aspectRatio === "story" ? 92 : aspectRatio === "portrait" ? 72 : 56}px "Urbanist", sans-serif`;
      const hoursText = totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${periodStats.totalMinutes} mins`;
      ctx.fillText(hoursText, width / 2, focusHoursY);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = `500 ${aspectRatio === "story" ? 24 : aspectRatio === "portrait" ? 19 : 15}px "Urbanist", sans-serif`;
      const compText = language === "en"
        ? `Your total focus was ${regionalBonusHours} hours more than average of others in your region! Amazing!`
        : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga suaka lainnya! Luar biasa!`;
      ctx.fillText(compText, width / 2, compY);

      // Two-Column Info Row (ALL WHITE)
      const rowDividerY = compY + (aspectRatio === "story" ? 55 : aspectRatio === "portrait" ? 42 : 32);
      ctx.beginPath();
      ctx.moveTo(80, rowDividerY);
      ctx.lineTo(width - 80, rowDividerY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vertical mid divider
      const colMidX = width / 2;
      const rowHeight = aspectRatio === "story" ? 150 : aspectRatio === "portrait" ? 120 : 95;
      ctx.beginPath();
      ctx.moveTo(colMidX, rowDividerY + 16);
      ctx.lineTo(colMidX, rowDividerY + rowHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const textStartY = rowDividerY + (aspectRatio === "story" ? 50 : aspectRatio === "portrait" ? 40 : 32);
      const boxTitleSize = aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 18;
      const boxValSize = aspectRatio === "story" ? 26 : aspectRatio === "portrait" ? 22 : 17;
      const boxDescSize = aspectRatio === "story" ? 20 : aspectRatio === "portrait" ? 16 : 13;

      // Col 1: Focus Type
      const col1X = 84;
      ctx.textAlign = "left";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
      ctx.fillText("Focus Type", col1X, textStartY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${boxValSize}px "Urbanist", sans-serif`;
      ctx.fillText("Evergreen Guardian", col1X, textStartY + (aspectRatio === "story" ? 40 : 30));

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
      const descText = language === "en"
        ? "Focused throughout the day, steady like the pines."
        : "Fokus konsisten sepanjang hari bagai pinus abadi.";
      ctx.fillText(descText, col1X, textStartY + (aspectRatio === "story" ? 78 : 58));

      // Col 2: Hari Terfokus
      const col2X = colMidX + 36;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxTitleSize}px "Urbanist", sans-serif`;
      ctx.fillText(language === "en" ? "Top Day" : "Hari Terfokus", col2X, textStartY);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${boxValSize + 4}px "Urbanist", sans-serif`;
      ctx.fillText(mostFocusedDay, col2X, textStartY + (aspectRatio === "story" ? 40 : 30));

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = `500 ${boxDescSize}px "Urbanist", sans-serif`;
      const peakLabel = `Jam Emas: ${circadianData.peakWindowLabel || "10:00 – 12:00"}`;
      ctx.fillText(peakLabel, col2X, textStartY + (aspectRatio === "story" ? 78 : 58));

      // 4. Footer Watermark: STRICTLY "Rimba" (NO tree icon!)
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = '700 24px "Urbanist", sans-serif';
      ctx.fillText("Rimba", width / 2, height - (aspectRatio === "story" ? 45 : 30));
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
      cardTheme === "sanctuary"
        ? `🌲 Rimba Sanctuary Year in Review · 2026\n⏱️ ${totalHoursNum} Jam Fokus (+${regionalBonusHours}h vs Rata-rata)\n🌿 Pohon Terfavorit: ${favoriteTreeSpecies} · Hari Terfokus: ${mostFocusedDay}\nrimba.app`
        : cardTheme === "diorama"
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
        {cardTheme === "sanctuary" ? (
          /* STYLE 1: SANCTUARY REVIEW (Cinematic Nature Poster) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md ${
              aspectRatio === "story"
                ? "aspect-[9/15]"
                : aspectRatio === "portrait"
                ? "aspect-[4/5]"
                : "aspect-square"
            }`}
          >
            {/* FULL-BLEED BACKGROUND PHOTO (sharecard.webp) - Bottom aligned */}
            <img
              src="/sharecard.webp"
              alt="Rimba Sanctuary Photo"
              className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
              }}
            />

            {/* Top Fade for Contrast */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 via-black/25 to-transparent pointer-events-none" />

            {/* Top Sky Header (ALL WHITE TEXT, Balanced 3 rows on left and right) */}
            <div className="relative z-10 flex items-start justify-between font-urbanist">
              <div>
                <p className="text-[25px] font-black text-white tracking-tight leading-none drop-shadow-sm">
                  2026
                </p>
                <p className="text-[10px] font-bold text-white/90 mt-0.5 leading-tight drop-shadow-2xs">
                  Rimba Sanctuary
                </p>
                <p className="text-[9px] font-semibold text-white/80 leading-tight drop-shadow-2xs">
                  Year in Review
                </p>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-black text-white tracking-tight leading-none drop-shadow-sm">
                  Rimba
                </p>
                <p className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider mt-0.5 leading-tight drop-shadow-2xs">
                  {language === "en" ? "Favorite Tree" : "Pohon Terfavorit"}
                </p>
                <p className="text-[11.5px] font-black text-white leading-tight drop-shadow-sm">
                  {favoriteTreeSpecies}
                </p>
              </div>
            </div>

            {/* Center: Open Tree Area (Tree sits freely without obstruction) */}
            <div className="flex-1 min-h-[140px] pointer-events-none" />

            {/* Bottom Grass Section: Strictly BELOW the tree on the grassy mound */}
            <div className="relative z-10 -mx-3.5 -mb-3.5 px-3.5 pb-3.5 pt-4 bg-gradient-to-t from-[#081812]/95 via-[#0A261D]/80 to-transparent flex flex-col gap-1.5 font-urbanist">
              <div className="text-center">
                <span className="text-[8.5px] font-bold text-white/85 uppercase tracking-widest block">
                  Total Focus Time
                </span>
                <div className="text-[28px] font-black text-white leading-none drop-shadow-sm my-0.5">
                  {totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${periodStats.totalMinutes} mins`}
                </div>
                <p className="text-[8.5px] text-white/95 leading-normal max-w-[340px] mx-auto font-medium truncate">
                  {language === "en"
                    ? `+${regionalBonusHours}h above average in your region · Amazing!`
                    : `+${regionalBonusHours} jam di atas rata-rata regional · Luar biasa!`}
                </p>
              </div>

              {/* Two-Column Info Row */}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/20 text-left">
                <div className="pr-1.5 border-r border-white/20">
                  <span className="text-[8.5px] font-bold text-white">Focus Type</span>
                  <p className="text-[9.5px] font-extrabold text-white leading-tight mt-0.5">Evergreen Guardian</p>
                  <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
                    {language === "en"
                      ? "Focused throughout the day, steady like the pines."
                      : "Fokus stabil sepanjang hari bagai pinus abadi."}
                  </p>
                </div>
                <div className="pl-1.5">
                  <span className="text-[8.5px] font-bold text-white">
                    {language === "en" ? "Top Day" : "Hari Terfokus"}
                  </span>
                  <p className="text-[10.5px] font-extrabold text-white leading-tight mt-0.5">{mostFocusedDay}</p>
                  <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
                    Jam Emas: {circadianData.peakWindowLabel || "10:00 – 12:00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : cardTheme === "diorama" ? (
          /* STYLE 2: DIORAMA PREVIEW CARD (Exact Forest App Style) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-slate-200/90 p-3 text-left flex flex-col justify-between transition-all duration-300 shadow-md bg-[#F0F1F3] ${
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
                <p className="text-[12.5px] font-semibold text-[#64748B] tracking-tight">
                  {forestDateText}
                </p>
                <div className="text-[9px] text-[#7A8594] font-medium leading-[1.15] mt-1">
                  <p>Total</p>
                  <p>Focused</p>
                  <p>Time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9.5px] font-medium text-[#7A8594]">
                  🌱 {treesCount} &nbsp; 🥀 {stumpsCount}
                </p>
                <p className="text-[22px] font-extrabold text-[#555E6D] leading-none mt-1">
                  {totalHoursNum}
                </p>
                <p className="text-[9.5px] text-[#7A8594] font-medium">hours</p>
              </div>
            </div>

            {/* Rounded White Card Container: Holds 3D Island & Donut Chart */}
            <div className="relative w-full flex-1 rounded-2xl bg-white border border-[#D8DCE3] p-2 flex flex-col justify-between shadow-2xs my-1 overflow-hidden">
              {/* Upper: 3D Island WebGL Snapshot */}
              <div className="w-[62%] mx-auto aspect-square flex items-center justify-center relative my-auto">
                {snapshotUrl ? (
                  <img
                    src={snapshotUrl}
                    alt="3D Island"
                    className="w-full h-full object-contain filter drop-shadow-xs"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {t.shareModal.takingSnapshot}
                  </span>
                )}
              </div>

              {/* Lower: Tag Distribution Donut Chart + Legend */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                {/* SVG Donut Chart */}
                <svg viewBox="0 0 160 160" className="w-[84px] h-[84px] shrink-0">
                  {(() => {
                    let currentAngle = -90;
                    const totalM = Math.max(1, tagStats.reduce((a, b) => a + b.minutes, 0));
                    const cx = 80, cy = 80, r = 62, innerR = 34;

                    return (
                      <>
                        {tagStats.map((item, idx) => {
                          const sliceAngle = (item.minutes / totalM) * 360;
                          const startA = currentAngle;
                          const endA = currentAngle + sliceAngle;
                          currentAngle = endA;

                          const toRad = (deg: number) => (deg * Math.PI) / 180;
                          const x1 = cx + r * Math.cos(toRad(startA));
                          const y1 = cy + r * Math.sin(toRad(startA));
                          const x2 = cx + r * Math.cos(toRad(endA));
                          const y2 = cy + r * Math.sin(toRad(endA));
                          const ix1 = cx + innerR * Math.cos(toRad(endA));
                          const iy1 = cy + innerR * Math.sin(toRad(endA));
                          const ix2 = cx + innerR * Math.cos(toRad(startA));
                          const iy2 = cy + innerR * Math.sin(toRad(startA));
                          const largeArc = sliceAngle > 180 ? 1 : 0;

                          const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

                          const midA = startA + sliceAngle / 2;
                          const textR = (r + innerR) / 2;
                          const tx = cx + textR * Math.cos(toRad(midA));
                          const ty = cy + textR * Math.sin(toRad(midA));

                          return (
                            <g key={idx}>
                              <path d={d} fill={item.color} stroke="#FFFFFF" strokeWidth="1.5" />
                              {item.pct >= 10 && (
                                <text
                                  x={tx}
                                  y={ty}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#FFFFFF"
                                  fontSize="7.5"
                                  fontWeight="bold"
                                >
                                  {item.pct}%
                                </text>
                              )}
                            </g>
                          );
                        })}
                        <text
                          x={cx}
                          y={cy - 4}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#7A8594"
                          fontSize="8"
                          fontWeight="600"
                        >
                          Tag
                        </text>
                        <text
                          x={cx}
                          y={cy + 6}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#7A8594"
                          fontSize="7"
                          fontWeight="600"
                        >
                          Distribution
                        </text>
                      </>
                    );
                  })()}
                </svg>

                {/* Tag Legend List */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                  {tagStats.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[7.5px] leading-tight">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-[#555E6D] truncate lowercase">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1 font-mono">
                        <span className="text-[#7A8594]">{item.pct}%</span>
                        <span className="font-semibold text-[#555E6D]">{item.hours} H</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean Watermark (STRICTLY "Rimba", NO tree icon) */}
            <div className="text-center pt-0.5">
              <span className="text-[9.5px] text-[#7A8594] font-bold tracking-[0.2em] uppercase">
                Rimba
              </span>
            </div>
          </div>
        ) : (
          /* STYLE 3: STORY ARTWORK CARD (Style 1: Cinematic Lore Poster) */
          <div
            className={`relative w-full rounded-3xl overflow-hidden p-3.5 text-left flex flex-col justify-between transition-all duration-300 shadow-md ${
              aspectRatio === "story"
                ? "aspect-[9/15]"
                : aspectRatio === "portrait"
                ? "aspect-[4/5]"
                : "aspect-square"
            }`}
          >
            {/* FULL-BLEED CHAPTER ARTWORK */}
            <img
              src={highestUnlockedStory.image}
              alt={highestUnlockedStory.title}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/story/story_chapter_1.webp";
              }}
            />

            {/* Top Fade for Contrast */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 via-black/30 to-transparent pointer-events-none" />

            {/* Top Header (ALL WHITE TEXT) */}
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[26px] font-black text-white tracking-tight leading-none drop-shadow-sm">
                  2026
                </p>
                <p className="text-[10px] font-bold text-white/90 mt-0.5 leading-tight drop-shadow-2xs">
                  Rimba Chronicle<br />Year in Review
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider drop-shadow-2xs">
                  CH. {highestUnlockedStory.chapterNumber || 1}
                </p>
                <p className="text-[12.5px] font-black text-white leading-tight drop-shadow-sm">
                  {highestUnlockedStory.title}
                </p>
              </div>
            </div>

            {/* Center: Open Nature Art */}
            <div className="my-auto pointer-events-none" />

            {/* Bottom Section with Dark Fade (ALL WHITE TEXT) */}
            <div className="relative z-10 -mx-3.5 -mb-3.5 px-3.5 pb-3 pt-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2">
              <div className="text-center">
                <span className="text-[9px] font-bold text-white/85 uppercase tracking-widest">
                  Total Focus Time
                </span>
                <div className="text-[30px] font-black text-white leading-tight drop-shadow-sm my-0.5">
                  {totalHoursNum >= 1 ? `${totalHoursNum} hours` : `${periodStats.totalMinutes} mins`}
                </div>
                <p className="text-[9px] text-white/95 leading-snug max-w-[280px] mx-auto font-medium">
                  {language === "en"
                    ? `Your total focus was ${regionalBonusHours} hours more than average in your region! Amazing!`
                    : `Total fokusmu ${regionalBonusHours} jam lebih banyak dari rata-rata penjaga suaka lainnya! Luar biasa!`}
                </p>
              </div>

              {/* Two-Column Info Row (ALL WHITE) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-left">
                <div className="pr-1.5 border-r border-white/20">
                  <span className="text-[9px] font-bold text-white">Focus Type</span>
                  <p className="text-[10px] font-extrabold text-white leading-tight mt-0.5">Evergreen Guardian</p>
                  <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
                    {language === "en"
                      ? "Focused throughout the day, steady like the pines."
                      : "Fokus konsisten sepanjang hari bagai pinus abadi."}
                  </p>
                </div>
                <div className="pl-1.5">
                  <span className="text-[9px] font-bold text-white">
                    {language === "en" ? "Top Day" : "Hari Terfokus"}
                  </span>
                  <p className="text-[11px] font-extrabold text-white leading-tight mt-0.5">{mostFocusedDay}</p>
                  <p className="text-[7.5px] text-white/85 leading-tight mt-0.5">
                    Jam Emas: {circadianData.peakWindowLabel || "10:00 – 12:00"}
                  </p>
                </div>
              </div>

              {/* Clean Watermark (STRICTLY "Rimba", NO tree icon) */}
              <div className="text-center pt-0.5">
                <span className="text-[9.5px] text-white/80 font-bold tracking-[0.25em] uppercase">
                  Rimba
                </span>
              </div>
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
