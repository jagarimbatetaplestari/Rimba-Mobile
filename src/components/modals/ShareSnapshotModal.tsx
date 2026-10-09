"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { calculateAnalytics, getStreakMilestone } from "@/lib/game/analytics";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, shareOrSaveImage } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { X, Download, Copy, Flame, Check, Share2 } from "lucide-react";

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

export function ShareSnapshotModal({
  isOpen,
  onClose,
}: ShareSnapshotModalProps) {
  const { t, language } = useTranslation();
  const sessions = useGameStore((state) => state.saveData.focus_sessions);
  const notify = useGameStore((state) => state.notify);

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"story" | "square">("story");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const analytics = useMemo(() => calculateAnalytics(sessions), [sessions]);
  const milestone = useMemo(
    () => getStreakMilestone(analytics.currentStreak),
    [analytics.currentStreak],
  );

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
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return dailyQuotes[dayOfYear % dailyQuotes.length];
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
          console.warn("Canvas export tainted or unavailable");
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const generateCompositeImage = async (): Promise<Blob | null> => {
    if (!snapshotUrl) return null;

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = aspectRatio === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Apple Editorial Botanical Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#081E15");
    bgGradient.addColorStop(0.35, "#0E2F23");
    bgGradient.addColorStop(0.7, "#144232");
    bgGradient.addColorStop(1, "#071B12");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Soft Ambient Radial Light at Top
    const radial = ctx.createRadialGradient(
      width / 2,
      aspectRatio === "story" ? 280 : 200,
      50,
      width / 2,
      aspectRatio === "story" ? 280 : 200,
      aspectRatio === "story" ? 750 : 600,
    );
    radial.addColorStop(0, "rgba(43, 182, 136, 0.22)");
    radial.addColorStop(0.6, "rgba(24, 117, 87, 0.06)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // 3. Delicate Editorial Outer Frame
    const inset = aspectRatio === "story" ? 36 : 28;
    const frameRadius = 44;
    drawRoundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, frameRadius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Header Section
    ctx.textAlign = "center";

    if (aspectRatio === "story") {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 36px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText("🌿   R I M B A", width / 2, 135);

      ctx.fillStyle = "#6EE7B7";
      ctx.font = '600 18px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(
        language === "en" ? "MINDFUL 3D SANCTUARY" : "SUAKA FOKUS & KETENANGAN",
        width / 2,
        175,
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.70)";
      ctx.font = '500 19px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(
        `${formattedDate.toUpperCase()}   •   ${milestone.icon} ${milestone.title.toUpperCase()}`,
        width / 2,
        215,
      );
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 30px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText("🌿   R I M B A", width / 2, 75);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = '500 18px "Urbanist", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(
        `${formattedDate.toUpperCase()}   •   ${milestone.icon} ${milestone.title.toUpperCase()}`,
        width / 2,
        110,
      );
    }

    // 5. Center 3D Diorama Image Artwork
    const imgSize = aspectRatio === "story" ? 840 : 660;
    const imgX = (width - imgSize) / 2;
    const imgY = aspectRatio === "story" ? 260 : 138;
    const imgRadius = 40;

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Drop Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 48;
        ctx.shadowOffsetY = 24;
        ctx.fillStyle = "#0B261D";
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
        ctx.fill();
        ctx.restore();

        // Clipped Image
        ctx.save();
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
        ctx.clip();

        const sWidth = img.width;
        const sHeight = img.height;
        const cropDim = Math.min(sWidth, sHeight);
        const sx = (sWidth - cropDim) / 2;
        const sy = (sHeight - cropDim) / 2;
        ctx.drawImage(img, sx, sy, cropDim, cropDim, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        // Inset Border & Highlight
        ctx.save();
        drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.40)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Glass Tag on top-left of diorama
        const badgeWidth = 240;
        const badgeHeight = 44;
        const badgeX = imgX + 24;
        const badgeY = imgY + 24;
        drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 22);
        ctx.fillStyle = "rgba(7, 24, 18, 0.75)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "#E4F4ED";
        ctx.font = '600 16px "Urbanist", sans-serif';
        ctx.fillText(
          `🌱 3D SANCTUARY`,
          badgeX + badgeWidth / 2,
          badgeY + 28,
        );

        resolve();
      };
      img.src = snapshotUrl;
    });

    // 6. Stats & Bento Card
    if (aspectRatio === "story") {
      const bentoY = 1140;
      const bentoHeight = 240;
      const bentoWidth = 840;
      const bentoX = (width - bentoWidth) / 2;

      // Bento Container (Glassmorphic)
      ctx.save();
      drawRoundedRect(ctx, bentoX, bentoY, bentoWidth, bentoHeight, 32);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Streak Hero Pill inside Bento
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 36px "Urbanist", sans-serif';
      ctx.fillText(
        `🔥   ${analytics.currentStreak} ${language === "en" ? "DAY STREAK" : "HARI BERUNTUN"}`,
        width / 2,
        bentoY + 68,
      );

      // Subtle Divider inside Bento
      ctx.beginPath();
      ctx.moveTo(bentoX + 48, bentoY + 104);
      ctx.lineTo(bentoX + bentoWidth - 48, bentoY + 104);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Two Column Stats
      const colLeft = bentoX + bentoWidth * 0.28;
      const colRight = bentoX + bentoWidth * 0.72;

      ctx.fillStyle = "#A7F3D0";
      ctx.font = '700 34px "Urbanist", sans-serif';
      ctx.fillText(`⏱️ ${analytics.todayMinutes}m`, colLeft, bentoY + 162);

      ctx.fillStyle = "rgba(255, 255, 255, 0.70)";
      ctx.font = '500 17px "Urbanist", sans-serif';
      ctx.fillText(
        language === "en" ? "Focus Today" : "Fokus Hari Ini",
        colLeft,
        bentoY + 198,
      );

      ctx.fillStyle = "#A7F3D0";
      ctx.font = '700 34px "Urbanist", sans-serif';
      ctx.fillText(`🌳 ${analytics.todayTrees}`, colRight, bentoY + 162);

      ctx.fillStyle = "rgba(255, 255, 255, 0.70)";
      ctx.font = '500 17px "Urbanist", sans-serif';
      ctx.fillText(
        language === "en" ? "Trees Planted" : "Pohon Tertanam",
        colRight,
        bentoY + 198,
      );

      // 7. Editorial Wisdom Quote
      const quoteY = 1460;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = 'italic 500 28px "Urbanist", serif';
      drawWrappedText(ctx, `“${todayQuote}”`, width / 2, quoteY, 780, 42);

      ctx.fillStyle = "rgba(110, 231, 183, 0.85)";
      ctx.font = '500 18px "Urbanist", sans-serif';
      ctx.fillText(
        language === "en" ? "— Rimba Mindful Sanctuary" : "— Suaka Refleksi Rimba",
        width / 2,
        quoteY + 110,
      );

      // 8. Footer Brand Capsule
      const footerY = 1790;
      const pillW = 460;
      const pillH = 52;
      const pillX = (width - pillW) / 2;
      drawRoundedRect(ctx, pillX, footerY, pillW, pillH, 26);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
      ctx.font = '600 19px "Urbanist", sans-serif';
      ctx.fillText(
        `rimba.app   •   ${language === "en" ? "Quiet Focus Sanctuary" : "Fokus Tenang & Suaka"}`,
        width / 2,
        footerY + 33,
      );
    } else {
      // Square Layout
      const bentoY = 825;
      const bentoHeight = 115;
      const bentoWidth = 740;
      const bentoX = (width - bentoWidth) / 2;

      drawRoundedRect(ctx, bentoX, bentoY, bentoWidth, bentoHeight, 28);
      ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = '700 26px "Urbanist", sans-serif';
      ctx.fillText(
        `🔥 ${analytics.currentStreak} ${language === "en" ? "Day Streak" : "Hari Beruntun"}   •   ⏱️ ${analytics.todayMinutes}m   •   🌳 ${analytics.todayTrees} ${language === "en" ? "Trees" : "Pohon"}`,
        width / 2,
        bentoY + 54,
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.70)";
      ctx.font = '500 17px "Urbanist", sans-serif';
      ctx.fillText(
        `🌾 ${milestone.title}   •   ${language === "en" ? "Total Focus:" : "Total Fokus:"} ${analytics.totalFocusMinutes}m`,
        width / 2,
        bentoY + 88,
      );

      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = '500 18px "Urbanist", sans-serif';
      ctx.fillText(
        `rimba.app   •   ${language === "en" ? "Mindful 3D Productivity" : "Produktivitas Hening 3D"}`,
        width / 2,
        1005,
      );
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

    if (!blob) {
      notify(language === "en" ? "Failed to create card image." : "Gagal membuat gambar kartu.", "error");
      return;
    }

    soundManager.playComplete();
    hapticSuccess();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const success = await shareOrSaveImage({
        title: language === "en" ? "Save to Photos" : "Simpan Gambar Rimba",
        text: `🌱 ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}`,
        dataUrl,
        fileName: `rimba-island-${Date.now()}.png`,
      });
      if (success) {
        notify(t.shareModal.iosSaveHint, "success");
      }
    };
    reader.readAsDataURL(blob);
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify(language === "en" ? "Failed to copy image." : "Gagal menyalin gambar.", "error");
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setIsCopied(true);
      hapticSuccess();
      setTimeout(() => setIsCopied(false), 2500);
      notify(t.shareModal.copySuccessToast, "success");
    } catch {
      notify(language === "en" ? "Please use Save Image button to save." : "Gunakan tombol Unduh Gambar untuk menyimpan.", "info");
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify(language === "en" ? "Failed to generate card." : "Gagal membuat gambar kartu.", "error");
      return;
    }

    soundManager.playComplete();
    hapticSuccess();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      await shareOrSaveImage({
        title: "Rimba Sanctuary",
        text: `🌱 ${t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))} #RimbaApp`,
        dataUrl,
        fileName: `rimba-suaka-${Date.now()}.png`,
      });
    };
    reader.readAsDataURL(blob);
  };

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

  if (!isOpen) return null;

  return (
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

        <div className="relative z-10 w-full max-w-[375px] max-h-[92vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {t.shareModal.title}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {t.shareModal.subtitle}
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

          {/* Segmented Control */}
          <div className="rounded-full p-1 border border-[#0D3528]/8 bg-[#0D3528]/5 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setAspectRatio("story");
              }}
              className={`py-1.5 px-3 rounded-full text-[12px] transition-all cursor-pointer ${
                aspectRatio === "story"
                  ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                  : "text-[#4C7567] hover:text-[#0D3528] font-medium"
              }`}
            >
              {t.shareModal.formatStory}
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setAspectRatio("square");
              }}
              className={`py-1.5 px-3 rounded-full text-[12px] transition-all cursor-pointer ${
                aspectRatio === "square"
                  ? "bg-white text-[#0D3528] shadow-xs font-semibold"
                  : "text-[#4C7567] hover:text-[#0D3528] font-medium"
              }`}
            >
              {t.shareModal.formatSquare}
            </button>
          </div>

          {/* Live Preview Card (Apple Editorial / Polaroid Botanical) */}
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-white/20 p-4 text-center flex flex-col items-center justify-between transition-all duration-300 shadow-xl ${
              aspectRatio === "story" ? "aspect-[9/13]" : "aspect-square"
            }`}
            style={{
              background:
                "linear-gradient(180deg, #0A261D 0%, #11382A 40%, #184A38 75%, #071B12 100%)",
            }}
          >
            <div className="space-y-0.5">
              <span className="text-[12px] font-bold tracking-widest text-white flex items-center justify-center gap-1.5">
                <span>🌿</span>
                <span>R I M B A</span>
              </span>
              <p className="text-[10px] text-emerald-200/80 font-medium">
                {formattedDate} · {milestone.icon} {milestone.title}
              </p>
            </div>

            <div className="w-[82%] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-white/40 my-1 bg-[#0B251B] flex items-center justify-center relative">
              {snapshotUrl ? (
                <img
                  src={snapshotUrl}
                  alt="Rimba 3D Island"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] text-emerald-100/70 font-normal">
                  {t.shareModal.takingSnapshot}
                </span>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20 text-[9px] font-medium text-emerald-100">
                🌱 3D SANCTUARY
              </div>
            </div>

            <div className="space-y-1 w-full max-w-[280px]">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold shadow-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{t.shareModal.streakDays.replace("{count}", String(analytics.currentStreak))}</span>
              </div>
              <p className="text-[10.5px] font-medium text-emerald-200/90 tabular-nums">
                {t.shareModal.todaySummary
                  .replace("{minutes}", String(analytics.todayMinutes))
                  .replace("{trees}", String(analytics.todayTrees))}
              </p>
              {aspectRatio === "story" && (
                <p className="text-[9.5px] text-emerald-100/75 italic px-2 line-clamp-1 font-normal">
                  &ldquo;{todayQuote}&rdquo;
                </p>
              )}
            </div>

            <span className="text-[9px] text-emerald-200/50 font-normal tracking-wide">
              rimba.app · {language === "en" ? "Mindful 3D Sanctuary" : "Suaka Fokus & Ketenangan"}
            </span>
          </div>

          {/* Action Buttons */}
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
