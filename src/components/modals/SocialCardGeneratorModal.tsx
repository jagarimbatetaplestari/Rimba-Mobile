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
import { hapticLight, hapticSuccess, shareOrSaveImage } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { X, Download, Share2, Copy, Check } from "lucide-react";

interface SocialCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customBadgeTitle?: string;
  customBadgeIcon?: string;
}

type CardTheme = "sage" | "emerald" | "sunset";
type CardFormat = "story" | "square";

export function SocialCardGeneratorModal({
  isOpen,
  onClose,
  customBadgeTitle,
}: SocialCardGeneratorModalProps) {
  const { t, language } = useTranslation();
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
      : [language === "en" ? "Focus" : "Fokus", analytics.totalFocusMinutes];
  }, [analytics, language]);

  const treesCount = useMemo(() => {
    return worldObjects.filter(
      (o) => o.object_type === "tree" && o.status === "active",
    ).length;
  }, [worldObjects]);

  const currentLevel = getLevelFromXp(saveData.profile.xp);

  const dailyQuotes = useMemo(
    () => [
      t.shareModal.quote1,
      t.shareModal.quote2,
      t.shareModal.quote3,
      t.shareModal.quote4,
      t.shareModal.quote5,
    ],
    [t],
  );

  const todayQuote = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return dailyQuotes[day % dailyQuotes.length];
  }, [dailyQuotes]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString(language === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [language]);

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

    if (theme === "sage") {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#38B28B");
      bgGrad.addColorStop(0.5, "#248769");
      bgGrad.addColorStop(1, "#165643");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else if (theme === "emerald") {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#0E4D3C");
      bgGrad.addColorStop(0.5, "#083327");
      bgGrad.addColorStop(1, "#041B14");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#E6B89C");
      bgGrad.addColorStop(0.5, "#CA9076");
      bgGrad.addColorStop(1, "#9E5F49");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    const mainTextColor = "#FFFFFF";
    const subTextColor = "rgba(255, 255, 255, 0.85)";

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

    const headerY = format === "story" ? 120 : 60;
    ctx.save();
    drawRoundedRect(width / 2 - 200, headerY, 400, 60, 30);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = mainTextColor;
    ctx.font = '600 24px "Urbanist", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      language === "en" ? "🌿 RIMBA SANCTUARY" : "🌿 RIMBA SUAKA",
      width / 2,
      headerY + 38,
    );
    ctx.restore();

    const userY = format === "story" ? 220 : 140;
    ctx.fillStyle = mainTextColor;
    ctx.font = '700 36px "Urbanist", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      user?.name ||
        saveData.world.name ||
        (language === "en" ? "Forest Ranger" : "Penjaga Rimba"),
      width / 2,
      userY,
    );

    ctx.fillStyle = subTextColor;
    ctx.font = '400 20px "Urbanist", sans-serif';
    ctx.fillText(
      `Level ${currentLevel} · ${zoneInfo.zoneName} · ${formattedDate}`,
      width / 2,
      userY + 36,
    );

    const imgSize = format === "story" ? 760 : 500;
    const imgX = (width - imgSize) / 2;
    const imgY = format === "story" ? 300 : 200;

    ctx.save();
    drawRoundedRect(imgX - 10, imgY - 10, imgSize + 20, imgSize + 20, 44);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
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
          // Center-crop to maintain natural square proportions of 3D sanctuary diorama
          const sWidth = img.width;
          const sHeight = img.height;
          const cropDim = Math.min(sWidth, sHeight);
          const sx = (sWidth - cropDim) / 2;
          const sy = (sHeight - cropDim) / 2;
          ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
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
      ctx.fillStyle = "rgba(13, 53, 40, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FDE68A";
      ctx.font = '600 22px "Urbanist", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(
        language === "en"
          ? `🏆 Badge: ${customBadgeTitle}`
          : `🏆 Lencana: ${customBadgeTitle}`,
        width / 2,
        badgeY + 38,
      );
      ctx.restore();
    }

    const statsY = format === "story" ? 1120 : 740;
    const cardW = 440;
    const cardH = 90;
    const gap = 20;

    const tile1X = width / 2 - cardW - gap / 2;
    drawRoundedRect(tile1X, statsY, cardW, cardH, 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🔥", tile1X + 24, statsY + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = '600 28px "Urbanist", sans-serif';
    ctx.fillText(
      `${analytics.currentStreak} ${language === "en" ? "Days" : "Hari"}`,
      tile1X + 76,
      statsY + 44,
    );
    ctx.fillStyle = subTextColor;
    ctx.font = '400 16px "Urbanist", sans-serif';
    ctx.fillText(
      language === "en" ? "Daily Streak" : "Ritme Beruntun",
      tile1X + 76,
      statsY + 68,
    );

    const tile2X = width / 2 + gap / 2;
    drawRoundedRect(tile2X, statsY, cardW, cardH, 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#10B981";
    ctx.font = "32px sans-serif";
    ctx.fillText("🌳", tile2X + 24, statsY + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = '600 28px "Urbanist", sans-serif';
    ctx.fillText(
      `${treesCount} ${language === "en" ? "Trees" : "Pohon"}`,
      tile2X + 76,
      statsY + 44,
    );
    ctx.fillStyle = subTextColor;
    ctx.font = '400 16px "Urbanist", sans-serif';
    ctx.fillText(
      language === "en" ? "Lush Trees" : "Pohon Subur",
      tile2X + 76,
      statsY + 68,
    );

    const tile3Y = statsY + cardH + 16;
    drawRoundedRect(tile1X, tile3Y, cardW, cardH, 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.font = "32px sans-serif";
    ctx.fillText("⏱️", tile1X + 24, tile3Y + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = '600 28px "Urbanist", sans-serif';
    ctx.fillText(`${analytics.totalFocusMinutes}m`, tile1X + 76, tile3Y + 44);
    ctx.fillStyle = subTextColor;
    ctx.font = '400 16px "Urbanist", sans-serif';
    ctx.fillText(
      `${language === "en" ? "Focus" : "Fokus"}: ${topTagEntry[0]}`,
      tile1X + 76,
      tile3Y + 68,
    );

    drawRoundedRect(tile2X, tile3Y, cardW, cardH, 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#34D399";
    ctx.font = "32px sans-serif";
    ctx.fillText("🏝️", tile2X + 24, tile3Y + 56);
    ctx.fillStyle = mainTextColor;
    ctx.font = '600 28px "Urbanist", sans-serif';
    ctx.fillText(
      `${unlockedSet.size}/100 ${language === "en" ? "Tiles" : "Petak"}`,
      tile2X + 76,
      tile3Y + 44,
    );
    ctx.fillStyle = subTextColor;
    ctx.font = '400 16px "Urbanist", sans-serif';
    ctx.fillText(zoneInfo.zoneName, tile2X + 76, tile3Y + 68);

    if (format === "story") {
      const quoteY = tile3Y + cardH + 70;
      ctx.fillStyle = mainTextColor;
      ctx.font = 'italic 24px "Urbanist", serif';
      ctx.textAlign = "center";
      ctx.fillText(`"${todayQuote}"`, width / 2, quoteY);

      ctx.fillStyle = subTextColor;
      ctx.font = '500 20px "Urbanist", sans-serif';
      ctx.fillText("rimba.app · Mindful 3D Sanctuary", width / 2, height - 100);
    } else {
      ctx.fillStyle = subTextColor;
      ctx.font = '500 18px "Urbanist", sans-serif';
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

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      await shareOrSaveImage({
        title: t.shareModal.downloadPng,
        text: `Rimba: ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}`,
        dataUrl,
        fileName: `rimba_photocard_${Date.now()}.png`,
      });
      notify(t.shareModal.iosSaveHint, "success");
    };
    reader.readAsDataURL(blob);
  };

  const handleShareNative = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) return;

    soundManager.playComplete();
    hapticSuccess();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const success = await shareOrSaveImage({
        title: `Rimba: ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}`,
        text: `🌱 ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))} · ${t.shareModal.treesLush.replace("{count}", String(treesCount))} · ${t.shareModal.tilesUnlocked.replace("{unlocked}", String(unlockedSet.size))}! https://rimba.app`,
        dataUrl,
        fileName: "rimba_focus_card.png",
      });
      if (!success) {
        handleCopyStatus();
      }
    };
    reader.readAsDataURL(blob);
  };

  const handleCopyStatus = () => {
    soundManager.playPop();
    hapticLight();
    const statusText = `🌲 Rimba — ${user?.name || saveData.world.name || t.shareModal.defaultUser}
🔥 ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}
🏝️ ${t.shareModal.tilesUnlocked.replace("{unlocked}", String(unlockedSet.size))} (${zoneInfo.zoneName})
⏱️ ${analytics.totalFocusMinutes}m
🌳 ${t.shareModal.treesLush.replace("{count}", String(treesCount))}
"${todayQuote}"
👉 https://rimba.app`;

    navigator.clipboard.writeText(statusText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
    notify(t.shareModal.copySuccessToast, "success");
  };

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
        className="fixed inset-0 z-[115] flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-[375px] max-h-[90vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {t.shareModal.socialTitle}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {t.shareModal.socialSubtitle}
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

          {/* Format & Theme Selectors */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex-1 rounded-full p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setFormat("story");
                }}
                className={`py-1.5 px-2 rounded-full text-[11.5px] transition-all cursor-pointer ${
                  format === "story"
                    ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
                }`}
              >
                {t.shareModal.formatStory}
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setFormat("square");
                }}
                className={`py-1.5 px-2 rounded-full text-[11.5px] transition-all cursor-pointer ${
                  format === "square"
                    ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                    : "text-[#4C7567] hover:text-[#0D3528] font-medium"
                }`}
              >
                {t.shareModal.formatSquare}
              </button>
            </div>

            {/* Theme Selector Dots */}
            <div className="flex items-center gap-1.5 p-1 rounded-full border border-[#0D3528]/8 bg-[#0D3528]/5">
              {[
                { id: "sage", label: "Sage", color: "bg-[#289874]" },
                { id: "emerald", label: "Emerald", color: "bg-[#0D3528]" },
                { id: "sunset", label: "Sunset", color: "bg-[#CA9076]" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setTheme(t.id as CardTheme);
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    t.color
                  } ${
                    theme === t.id
                      ? "ring-2 ring-white scale-105 shadow-xs"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={t.label}
                >
                  {theme === t.id && (
                    <Check className="w-3 h-3 text-white stroke-[2.5]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Preview Box */}
          <div className="flex-1 overflow-y-auto no-scrollbar flex items-center justify-center p-3 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8">
            <div
              className={`rounded-2xl overflow-hidden shadow-md border border-white/90 relative flex flex-col items-center justify-between p-3.5 text-center transition-all ${
                theme === "sage"
                  ? "bg-gradient-to-b from-[#38B28B] to-[#165643] text-white"
                  : theme === "emerald"
                    ? "bg-gradient-to-b from-[#0E4D3C] to-[#041B14] text-white"
                    : "bg-gradient-to-b from-[#E6B89C] to-[#9E5F49] text-white"
              } ${format === "story" ? "w-44 h-72" : "w-48 h-48"}`}
            >
              <div className="px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-[9px] font-semibold tracking-wider">
                {language === "en" ? "🌿 RIMBA SANCTUARY" : "🌿 RIMBA SUAKA"}
              </div>

              <div className="w-20 h-20 rounded-xl border border-white/30 bg-white/20 p-0.5 flex items-center justify-center overflow-hidden my-auto shadow-2xs">
                {snapshotUrl ? (
                  <img
                    src={snapshotUrl}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-2xl">{streakInfo.icon}</span>
                )}
              </div>

              <div className="w-full space-y-0.5">
                <span className="text-[11px] font-semibold block truncate text-white">
                  {user?.name || saveData.world.name}
                </span>
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-emerald-100/90 tabular-nums">
                  <span>🔥 {t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}</span>
                  <span>·</span>
                  <span>🌳 {treesCount}</span>
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
              className="py-2.5 px-3 rounded-full border border-[#0D3528]/15 bg-white hover:bg-[#E4F4ED]/50 text-xs font-medium text-[#0D3528] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#187557] stroke-[1.8]" />
              <span>{t.shareModal.downloadPng}</span>
            </button>

            <button
              type="button"
              onClick={handleShareNative}
              disabled={isGenerating}
              className="py-2.5 px-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4 stroke-[1.8]" />
              <span>{t.shareModal.shareStatus}</span>
            </button>
          </div>

          {/* Copy Text Fallback */}
          <button
            type="button"
            onClick={handleCopyStatus}
            className="w-full py-0.5 text-[11.5px] text-[#4C7567] hover:text-[#0D3528] transition-colors flex items-center justify-center gap-1 cursor-pointer font-normal"
          >
            <Copy className="w-3 h-3 stroke-[1.8]" />
            <span>
              {isCopied ? t.shareModal.copied : t.shareModal.copyStatus}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
