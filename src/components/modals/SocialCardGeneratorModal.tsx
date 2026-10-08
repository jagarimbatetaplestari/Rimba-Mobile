"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { calculateAnalytics, getStreakMilestone } from "@/lib/game/analytics";
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
} from "@/lib/game/worldRules";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { X, Download, Share2, Copy, Sparkles, Check } from "lucide-react";

interface SocialCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customBadgeTitle?: string;
  customBadgeIcon?: string;
}

type CardTheme = "sage" | "emerald" | "sunset";
type CardFormat = "story" | "square";

const DAILY_QUOTES = [
  "Setiap pohon tumbuh dari ketenangan yang kamu rawat.",
  "Hutan yang rimbun berawal dari satu benih fokus yang tekun.",
  "Di antara bising dunia, ada pulau tenang yang terus bertumbuh.",
  "Fokus adalah caramu merawat masa depan, menit demi menit.",
  "Ketenangan jiwa adalah akar dari produktivitas sejati.",
];

export function SocialCardGeneratorModal({
  isOpen,
  onClose,
  customBadgeTitle,
  customBadgeIcon,
}: SocialCardGeneratorModalProps) {
  const saveData = useGameStore((state) => state.saveData);
  const user = useAuthStore((state) => state.user);
  const notify = useGameStore((state) => state.notify);

  const [theme, setTheme] = useState<CardTheme>("sage");
  const [format, setFormat] = useState<CardFormat>("story");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const sessions = saveData.focus_sessions || [];
  const worldObjects = saveData.world_objects || [];
  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);
  const streakInfo = useMemo(
    () => getStreakMilestone(analytics.currentStreak),
    [analytics.currentStreak],
  );

  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(saveData.world, worldObjects),
    [saveData.world, worldObjects],
  );
  const zoneInfo = useMemo(
    () => getLandExpansionZoneInfo(unlockedSet.size),
    [unlockedSet.size],
  );

  const topTagEntry = useMemo(() => {
    const entries = Object.entries(analytics.tagDistribution).sort(
      (a, b) => b[1] - a[1],
    );
    return entries.length > 0
      ? entries[0]
      : ["Fokus", analytics.totalFocusMinutes];
  }, [analytics]);

  const treesCount = useMemo(() => {
    return worldObjects.filter(
      (o) => o.object_type === "tree" && o.status === "active",
    ).length;
  }, [worldObjects]);

  const currentLevel = getLevelFromXp(saveData.profile.xp);

  const todayQuote = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return DAILY_QUOTES[day % DAILY_QUOTES.length];
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvasEl = document.querySelector("canvas");
      if (canvasEl) {
        try {
          const dataUrl = canvasEl.toDataURL("image/png");
          setSnapshotUrl(dataUrl);
        } catch {
          // Canvas export fallback
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const generateCompositeImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = format === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Theme Background
    if (theme === "sage") {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#D4E7DC");
      bgGrad.addColorStop(0.5, "#C5DFD1");
      bgGrad.addColorStop(1, "#B4D3C2");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else if (theme === "emerald") {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#062E21");
      bgGrad.addColorStop(0.5, "#0B3F2E");
      bgGrad.addColorStop(1, "#041B13");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Sunset
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#F5E6DA");
      bgGrad.addColorStop(0.5, "#ECCFC0");
      bgGrad.addColorStop(1, "#D8B39F");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    const isDarkTheme = theme === "emerald";
    const mainTextColor = isDarkTheme ? "#E6F4EA" : "#143525";
    const subTextColor = isDarkTheme ? "#A7F3D0" : "#456B57";

    // Helper: Rounded Rectangle
    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Header Capsule
    const headerY = format === "story" ? 120 : 60;
    ctx.save();
    drawRoundedRect(width / 2 - 200, headerY, 400, 60, 30);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(255, 255, 255, 0.7)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = mainTextColor;
    ctx.font =
      'bold 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("🌿 RIMBA SUAKA", width / 2, headerY + 38);
    ctx.restore();

    // User Identity Banner
    const userY = format === "story" ? 220 : 140;
    ctx.fillStyle = mainTextColor;
    ctx.font =
      'bold 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      user?.name || saveData.world.name || "Penjaga Rimba",
      width / 2,
      userY,
    );

    ctx.fillStyle = subTextColor;
    ctx.font =
      '20px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.fillText(
      `Level ${currentLevel} · ${zoneInfo.zoneName} · ${formattedDate}`,
      width / 2,
      userY + 36,
    );

    // Snapshot Canvas Box
    const imgSize = format === "story" ? 760 : 500;
    const imgX = (width - imgSize) / 2;
    const imgY = format === "story" ? 300 : 200;

    ctx.save();
    drawRoundedRect(imgX - 10, imgY - 10, imgSize + 20, imgSize + 20, 44);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(255, 255, 255, 0.75)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(52, 211, 153, 0.3)"
      : "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (snapshotUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          drawRoundedRect(imgX, imgY, imgSize, imgSize, 36);
          ctx.clip();
          ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = snapshotUrl;
      });
    }

    if (customBadgeTitle) {
      const badgeY = imgY + imgSize - 70;
      ctx.save();
      drawRoundedRect(width / 2 - 220, badgeY, 440, 60, 30);
      ctx.fillStyle = "rgba(20, 53, 37, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FDE68A";
      ctx.font =
        'bold 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(`🏆 Lencana: ${customBadgeTitle}`, width / 2, badgeY + 38);
      ctx.restore();
    }

    // Stats Grid
    const statsY = format === "story" ? 1120 : 740;
    const cardW = 440;
    const cardH = 90;
    const gap = 20;

    const tile1X = width / 2 - cardW - gap / 2;
    drawRoundedRect(tile1X, statsY, cardW, cardH, 24);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.8)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🔥", tile1X + 24, statsY + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${analytics.currentStreak} Hari`, tile1X + 76, statsY + 44);
    ctx.fillStyle = subTextColor;
    ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Ritme Beruntun", tile1X + 76, statsY + 68);

    const tile2X = width / 2 + gap / 2;
    drawRoundedRect(tile2X, statsY, cardW, cardH, 24);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.8)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#10B981";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("🌳", tile2X + 24, statsY + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${treesCount} Pohon`, tile2X + 76, statsY + 44);
    ctx.fillStyle = subTextColor;
    ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Pohon Subur", tile2X + 76, statsY + 68);

    const tile3Y = statsY + cardH + 16;
    drawRoundedRect(tile1X, tile3Y, cardW, cardH, 24);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.8)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#0284C7";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("⏱️", tile1X + 24, tile3Y + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${analytics.totalFocusMinutes}m`, tile1X + 76, tile3Y + 44);
    ctx.fillStyle = subTextColor;
    ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`Fokus: ${topTagEntry[0]}`, tile1X + 76, tile3Y + 68);

    drawRoundedRect(tile2X, tile3Y, cardW, cardH, 24);
    ctx.fillStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.8)";
    ctx.fill();
    ctx.strokeStyle = isDarkTheme
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#10B981";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("🏝️", tile2X + 24, tile3Y + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${unlockedSet.size}/100 Petak`, tile2X + 76, tile3Y + 44);
    ctx.fillStyle = subTextColor;
    ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(zoneInfo.zoneName, tile2X + 76, tile3Y + 68);

    if (format === "story") {
      const quoteY = tile3Y + cardH + 70;
      ctx.fillStyle = mainTextColor;
      ctx.font =
        'italic 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", serif';
      ctx.textAlign = "center";
      ctx.fillText(`"${todayQuote}"`, width / 2, quoteY);

      ctx.fillStyle = subTextColor;
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("rimba.app · Mindful 3D Sanctuary", width / 2, height - 100);
    } else {
      ctx.fillStyle = subTextColor;
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("rimba.app · Mindful 3D Sanctuary", width / 2, height - 40);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) return;

    soundManager.playComplete();
    hapticSuccess();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rimba_snapshot_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify("🖼️ Kartu pamer suaka berhasil diunduh ke galeri!", "success");
  };

  const handleShareNative = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) return;

    const file = new File([blob], "rimba_focus_card.png", {
      type: "image/png",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Suaka Rimba: ${analytics.currentStreak} Hari Beruntun`,
          text: `Saya telah memperluas pulau ke ${unlockedSet.size}/100 petak (${zoneInfo.zoneName}), menanam ${treesCount} pohon, dan fokus ${analytics.totalFocusMinutes}m di Rimba!`,
          files: [file],
        });
        soundManager.playComplete();
        hapticSuccess();
        return;
      } catch {
        // User cancelled share
      }
    }

    handleCopyStatus();
  };

  const handleCopyStatus = () => {
    soundManager.playPop();
    hapticLight();
    const statusText = `🌲 Suaka Rimba — ${user?.name || saveData.world.name}
🔥 Streak: ${analytics.currentStreak} Hari Beruntun
🏝️ Wilayah: ${unlockedSet.size}/100 Petak (${zoneInfo.zoneName})
⏱️ Total Fokus: ${analytics.totalFocusMinutes}m
🌳 Pohon Subur: ${treesCount} Pohon Lestari
"${todayQuote}"
👉 https://rimba.app`;

    navigator.clipboard.writeText(statusText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
    notify("📋 Teks status berhasil disalin ke clipboard!", "success");
  };

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
      {/* Backdrop Ethereal Blur */}
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
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              Kartu Pamer
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              Bagikan Suaka
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup kartu pamer"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Format & Theme Selectors */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Format Toggle */}
          <div className="flex-1 rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setFormat("story");
              }}
              className={`py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                format === "story"
                  ? "bg-white text-[#143525] shadow-xs"
                  : "text-[#456b57] hover:text-[#143525]"
              }`}
            >
              📱 Cerita (9:16)
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setFormat("square");
              }}
              className={`py-1.5 px-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                format === "square"
                  ? "bg-white text-[#143525] shadow-xs"
                  : "text-[#456b57] hover:text-[#143525]"
              }`}
            >
              ⏹️ Persegi (1:1)
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-full border border-white/85 bg-white/60 shadow-2xs">
            {[
              { id: "sage", label: "Sage", color: "bg-[#bfdac8]" },
              { id: "emerald", label: "Emerald", color: "bg-[#1e5638]" },
              { id: "sunset", label: "Sunset", color: "bg-[#d8b39f]" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  setTheme(t.id as CardTheme);
                }}
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  t.color
                } ${
                  theme === t.id
                    ? "ring-2 ring-[#143525] scale-105 shadow-2xs"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={t.label}
              >
                {theme === t.id && (
                  <Check className="w-3 h-3 text-white stroke-[2.4]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Live Mini Preview Box */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex items-center justify-center p-3 rounded-[26px] bg-[#143525]/5 border border-white/80 shadow-2xs">
          <div
            className={`rounded-[22px] overflow-hidden shadow-sm border border-white/90 relative flex flex-col items-center justify-between p-3.5 text-center transition-all ${
              theme === "sage"
                ? "bg-gradient-to-b from-[#d4e7dc] via-[#c5dfd1] to-[#b4d3c2]"
                : theme === "emerald"
                  ? "bg-gradient-to-b from-[#062e21] via-[#0b3f2e] to-[#041b13] text-white"
                  : "bg-gradient-to-b from-[#f5e6da] via-[#eccfc0] to-[#d8b39f]"
            } ${format === "story" ? "w-44 h-72" : "w-48 h-48"}`}
          >
            {/* Header pill */}
            <div
              className={`px-2.5 py-0.5 rounded-full border text-[8.5px] font-bold tracking-wider ${
                theme === "emerald"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/70 border-white/80 text-[#143525]"
              }`}
            >
              🌿 RIMBA SUAKA
            </div>

            {/* Middle snapshot preview */}
            <div className="w-22 h-22 rounded-[16px] border border-white/80 bg-white/40 p-0.5 flex items-center justify-center overflow-hidden my-auto shadow-2xs">
              {snapshotUrl ? (
                <img
                  src={snapshotUrl}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <span className="text-2xl">{streakInfo.icon}</span>
              )}
            </div>

            {/* Bottom info */}
            <div className="w-full space-y-0.5">
              <span
                className={`text-[10.5px] font-semibold block truncate ${
                  theme === "emerald" ? "text-white" : "text-[#143525]"
                }`}
              >
                {user?.name || saveData.world.name}
              </span>
              <div
                className={`flex items-center justify-center gap-1.5 text-[8.5px] font-medium ${
                  theme === "emerald" ? "text-emerald-200" : "text-[#456b57]"
                }`}
              >
                <span>🔥 {analytics.currentStreak} Hari</span>
                <span>·</span>
                <span>🌳 {treesCount} Pohon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0 pt-0.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="py-2.5 px-3 rounded-full border border-white/90 bg-white/75 hover:bg-white text-xs font-semibold text-[#143525] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#1e5638]" />
            <span>Unduh PNG</span>
          </button>

          <button
            type="button"
            onClick={handleShareNative}
            disabled={isGenerating}
            className="py-2.5 px-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Status</span>
          </button>
        </div>

        {/* Copy text fallback */}
        <button
          type="button"
          onClick={handleCopyStatus}
          className="w-full py-1 rounded-full text-[11px] text-[#456b57] hover:text-[#143525] transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Copy className="w-3 h-3" />
          <span>
            {isCopied ? "Teks Tersalin!" : "Salin Teks Status Ringkas"}
          </span>
        </button>
      </div>
    </div>
  );
}
