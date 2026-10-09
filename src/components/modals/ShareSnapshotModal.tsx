"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { calculateAnalytics, getStreakMilestone } from "@/lib/game/analytics";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { X, Download, Copy, Flame, Check, Share2 } from "lucide-react";

interface ShareSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAILY_QUOTES = [
  "Setiap pohon tumbuh dari ketenangan yang kamu jaga.",
  "Hutan yang rimbun berawal dari satu benih fokus yang tekun.",
  "Ketenangan bukan ketiadaan badai, melainkan keteguhan di dalamnya.",
  "Fokus adalah caramu merawat masa depan, satu menit demi satu menit.",
  "Di antara bising dunia, ada pulau tenang yang terus bertumbuh.",
];

export function ShareSnapshotModal({
  isOpen,
  onClose,
}: ShareSnapshotModalProps) {
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

  const todayQuote = useMemo(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
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

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#38B28B");
    bgGradient.addColorStop(0.5, "#248769");
    bgGradient.addColorStop(1, "#165643");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 120;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '600 44px "Urbanist", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("🌿 RIMBA", width / 2, aspectRatio === "story" ? 160 : 100);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = '500 22px "Urbanist", sans-serif';
    ctx.fillText(
      "MINDFUL 3D SANCTUARY",
      width / 2,
      aspectRatio === "story" ? 205 : 135,
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = '400 24px "Urbanist", sans-serif';
    ctx.fillText(formattedDate, width / 2, aspectRatio === "story" ? 260 : 180);

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        const imgSize = aspectRatio === "story" ? 840 : 680;
        const imgX = (width - imgSize) / 2;
        const imgY = aspectRatio === "story" ? 320 : 210;

        const r = 40;
        ctx.beginPath();
        ctx.moveTo(imgX + r, imgY);
        ctx.arcTo(imgX + imgSize, imgY, imgX + imgSize, imgY + imgSize, r);
        ctx.arcTo(imgX + imgSize, imgY + imgSize, imgX, imgY + imgSize, r);
        ctx.arcTo(imgX, imgY + imgSize, imgX, imgY, r);
        ctx.arcTo(imgX, imgY, imgX + imgSize, imgY, r);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        resolve();
      };
      img.src = snapshotUrl;
    });

    const statsY = aspectRatio === "story" ? 1230 : 920;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '600 42px "Urbanist", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      `🔥 ${analytics.currentStreak} Hari Beruntun`,
      width / 2,
      statsY,
    );

    ctx.fillStyle = "#D1FAE5";
    ctx.font = '500 28px "Urbanist", sans-serif';
    ctx.fillText(
      `⏱️ ${analytics.todayMinutes}m Fokus Hari Ini  •  🌳 ${analytics.todayTrees} Pohon Tumbuh`,
      width / 2,
      statsY + 60,
    );

    if (aspectRatio === "story") {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'italic 26px "Urbanist", sans-serif';
      ctx.fillText(`"${todayQuote}"`, width / 2, statsY + 220);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = '500 22px "Urbanist", sans-serif';
      ctx.fillText(
        "rimba.app  •  Fokus Tenang, Tumbuhkan Hutanmu",
        width / 2,
        height - 120,
      );
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = '500 20px "Urbanist", sans-serif';
      ctx.fillText(
        "rimba.app  •  Mindful 3D Productivity",
        width / 2,
        height - 35,
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
      notify("Gagal membuat gambar kartu.", "error");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rimba-island-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    hapticSuccess();
    notify("🎉 Kartu diorama berhasil diunduh!", "success");
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify("Gagal menyalin gambar.", "error");
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setIsCopied(true);
      hapticSuccess();
      setTimeout(() => setIsCopied(false), 2500);
      notify("📋 Gambar kartu disalin ke clipboard!", "success");
    } catch {
      notify("Gunakan tombol Unduh Kartu untuk menyimpan gambar.", "info");
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    soundManager.playPop();
    hapticLight();
    const blob = await generateCompositeImage();
    setIsGenerating(false);

    if (!blob) {
      notify("Gagal membuat gambar kartu.", "error");
      return;
    }

    const file = new File([blob], `rimba-suaka-${Date.now()}.png`, {
      type: "image/png",
    });

    if (
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "Suaka Fokus Rimba",
          text: `🌱 Hutan ketenanganku terus bertumbuh di Rimba. ${analytics.currentStreak} hari fokus beruntun! #RimbaApp`,
        });
        hapticSuccess();
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleDownload();
        }
        return;
      }
    }
    handleDownload();
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
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
                Bagikan Pulau
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                Kartu Diorama
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              aria-label="Tutup bagikan pulau"
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
              📱 Cerita (9:16)
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
              ⏹️ Persegi (1:1)
            </button>
          </div>

          {/* Live Preview Card */}
          <div
            className={`relative w-full rounded-3xl overflow-hidden border border-white p-4 text-center flex flex-col items-center justify-between transition-all duration-300 shadow-md ${
              aspectRatio === "story" ? "aspect-[9/13]" : "aspect-square"
            }`}
            style={{
              background:
                "linear-gradient(180deg, #E4F4ED 0%, #D5EDE2 50%, #C2E4D5 100%)",
            }}
          >
            <div className="space-y-0.5">
              <span className="text-[12px] font-semibold tracking-wider text-[#0D3528] flex items-center justify-center gap-1">
                <span>🌿</span>
                <span>RIMBA</span>
              </span>
              <p className="text-[10.5px] text-[#4C7567] font-normal">
                {formattedDate} · {milestone.icon} {milestone.title}
              </p>
            </div>

            <div className="w-[82%] aspect-square rounded-2xl overflow-hidden shadow-xs border-2 border-white my-1 bg-white/60 flex items-center justify-center">
              {snapshotUrl ? (
                <img
                  src={snapshotUrl}
                  alt="Rimba 3D Island"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] text-[#4C7567] font-normal">
                  Mengambil foto pulau...
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/90 border border-white text-[#0D3528] text-[11px] font-medium shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{analytics.currentStreak} Hari Beruntun</span>
              </div>
              <p className="text-[11px] font-normal text-[#4C7567] tabular-nums">
                {analytics.todayMinutes}m Fokus · {analytics.todayTrees} Pohon
                Tumbuh
              </p>
              {aspectRatio === "story" && (
                <p className="text-[10px] text-[#0D3528]/80 italic max-w-xs px-2 line-clamp-1 font-normal">
                  &ldquo;{todayQuote}&rdquo;
                </p>
              )}
            </div>

            <span className="text-[9.5px] text-[#4C7567]/75 font-normal">
              rimba.app · Mindful Sanctuary
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
              <span>{isGenerating ? "Menyiapkan Cerita..." : "Bagikan ke Cerita (Story / WA)"}</span>
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
                <span>{isCopied ? "Tersalin!" : "Salin"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="py-2 px-3 rounded-full border border-[#0D3528]/15 bg-white hover:bg-[#E4F4ED]/50 text-[11.5px] font-medium text-[#0D3528] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.8]" />
                <span>Unduh Gambar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
